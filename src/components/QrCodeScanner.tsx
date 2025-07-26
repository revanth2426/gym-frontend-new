import React, { useEffect, useRef, useState, useCallback, type FunctionComponent } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

interface QrCodeScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanError?: (errorMessage: string) => void;
  qrCodeError: string | null;
  showScanner: boolean; // Prop to control scanner's active state
}

const qrcodeRegionId = "qrcode-reader-div"; // Unique ID for the scanner's div

const SCAN_COOLDOWN_MS = 500; // 5 seconds

const QrCodeScanner: FunctionComponent<QrCodeScannerProps> = ({ onScanSuccess, onScanError, qrCodeError, showScanner }) => {
  const html5QrcodeRef = useRef<Html5Qrcode | null>(null);
  const [cameraPermissionError, setCameraPermissionError] = useState<string | null>(null);
  const [isScannerRunning, setIsScannerRunning] = useState(false); // Our internal state for running status
  const [isCoolingDown, setIsCoolingDown] = useState(false); // State to manage cooldown after a successful scan

  const latestOnScanSuccess = useRef(onScanSuccess);
  const latestOnScanError = useRef(onScanError);

  const isSetupInProgress = useRef(false); // Lock to prevent race conditions

  useEffect(() => {
    latestOnScanSuccess.current = onScanSuccess;
    latestOnScanError.current = onScanError;
  }, [onScanSuccess, onScanError]);

  const stopScanner = useCallback(async () => {
    if (!html5QrcodeRef.current || !isScannerRunning || isSetupInProgress.current) {
      return; // Prevent stopping if not initialized, not running, or setup is in progress
    }
    isSetupInProgress.current = true; // Mark setup in progress to prevent re-entry

    try {
      if (html5QrcodeRef.current.isScanning) {
        await html5QrcodeRef.current.stop();
        console.log("QR Code scanner stopped successfully.");
      }
    } catch (err: any) {
      console.error("Failed to stop QR Code scanner:", err);
      if (latestOnScanError.current) latestOnScanError.current(`Failed to stop scanner gracefully: ${String(err)}`);
    } finally {
      setIsScannerRunning(false);
      setCameraPermissionError(null);
      setIsCoolingDown(false); // Reset cooldown on stop
      isSetupInProgress.current = false; // Release setup lock
    }
  }, [isScannerRunning]);

  const startScanner = useCallback(async () => {
    if (isScannerRunning || !showScanner || isSetupInProgress.current) {
      return; // Prevent starting if already running, not meant to be shown, or setup is in progress
    }
    isSetupInProgress.current = true; // Mark setup in progress to prevent re-entry

    setCameraPermissionError(null);

    const config = {
      fps: 10,
      qrbox: { width: 250, height: 250 },
      rememberLastUsedCamera: true,
      formatsToSupport: [
        Html5QrcodeSupportedFormats.QR_CODE, Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.EAN_13, Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.ITF, Html5QrcodeSupportedFormats.DATA_MATRIX,
        Html5QrcodeSupportedFormats.AZTEC, Html5QrcodeSupportedFormats.PDF_417,
      ],
      disableFlip: false,
    };

    // --- MOVED ON SUCCESS FUNCTION OUTSIDE so restartScanner can be referenced ---
    const onScanSuccessInternal = (decodedText: string, decodedResult: any) => {
      if (isCoolingDown) {
        console.log(`Scan detected during cooldown: ${decodedText}. Ignoring.`);
        return;
      }

      latestOnScanSuccess.current(decodedText);

      setIsCoolingDown(true);

      // --- COOLDOWN, then RESTART scanner ---
      setTimeout(async () => {
        setIsCoolingDown(false);
        console.log("Scanner cooldown ended. Restarting scanner...");
        if (showScanner) {
          await restartScanner();
        }
      }, SCAN_COOLDOWN_MS);
    };

    const onScanFailureInternal = (error: string) => {
      const isNonCriticalError = error.includes("No MultiFormat Readers were able to detect the code.") ||
        error.includes("QR code parse error") ||
        error.includes("unable to parse scan result");

      if (!isNonCriticalError) {
        if (error.includes("NotAllowedError") || error.includes("NotFoundError") || error.includes("SecurityError") || error.includes("OverconstrainedError")) {
          setCameraPermissionError("Camera access denied or no camera found. Please grant permission and ensure a webcam is connected.");
          setIsScannerRunning(false);
        }
        if (latestOnScanError.current) {
          latestOnScanError.current(error);
        }
      } else {
        // console.warn("Non-critical scan error:", error);
      }
    };

    try {
      if (!html5QrcodeRef.current) {
        html5QrcodeRef.current = new Html5Qrcode(qrcodeRegionId, { verbose: false });
      }

      const cameras = await Html5Qrcode.getCameras();
      if (cameras && cameras.length) {
        await html5QrcodeRef.current.start(cameras[0].id, config, onScanSuccessInternal, onScanFailureInternal);
        console.log("QR Code scanner started successfully.");
        setIsScannerRunning(true);
      } else {
        throw new Error("No cameras found.");
      }
    } catch (err: any) {
      console.error("Failed to start QR Code scanner:", err);
      setCameraPermissionError(`Failed to start camera: ${err.message || err}`);
      setIsScannerRunning(false);
      // Attempt to clear scanner resources if startup failed
      if (html5QrcodeRef.current && html5QrcodeRef.current.isScanning) {
        html5QrcodeRef.current.stop().catch(console.error);
      }
      if (latestOnScanError.current) latestOnScanError.current(`Failed to initialize scanner: ${err.message || err}`);
    } finally {
      isSetupInProgress.current = false; // Release setup lock
    }
  }, [showScanner, isScannerRunning, stopScanner, isCoolingDown]);

  // --- RESTART SCANNER FUNCTION: stop + short delay + start ---
  const restartScanner = useCallback(async () => {
    await stopScanner();
    //setTimeout(startScanner, 200); // short delay to allow resources to be released
    startScanner();
  }, [stopScanner, startScanner]);

  // Main useEffect to manage scanner lifecycle based on the `showScanner` prop
  useEffect(() => {
    let timeoutId: NodeJS.Timeout | undefined;

    if (showScanner) {
      //timeoutId = setTimeout(() => {startScanner();}, 100); 
      startScanner();
    } else {
      stopScanner();
    }
    // Cleanup function: ensures scanner is stopped when the component unmounts
    return () => {
      if (timeoutId) clearTimeout(timeoutId); // Clear any pending start timers

      if (html5QrcodeRef.current && html5QrcodeRef.current.isScanning) {
        html5QrcodeRef.current.stop().then(() => {
          console.log("QR Code scanner cleared on component unmount.");
        }).catch(e => console.error("Error clearing scanner on unmount:", e));
      }
    };
  }, [showScanner, startScanner, stopScanner]); // Dependencies: showScanner prop, memoized start/stop callbacks

  // Render the scanner UI
  return (
    <div className="relative p-4 border border-gray-300 rounded-md bg-white shadow-sm flex flex-col items-center">
      <h3 className="text-xl font-semibold text-gray-800 mb-4">Scan QR Code / Barcode</h3>
      {cameraPermissionError && (
        <p className="text-red-500 text-center mb-4 p-2 bg-red-100 border border-red-200 rounded-md">
          {cameraPermissionError}
        </p>
      )}
      {qrCodeError && (
        <p className="text-red-500 text-center mb-4 p-2 bg-red-100 border border-red-200 rounded-md">
          {qrCodeError}
        </p>
      )}
      {!isScannerRunning && !cameraPermissionError && !qrCodeError && showScanner && (
        <p className="text-gray-500 text-center mb-4">Initializing scanner... Please ensure camera is enabled and grant permission.</p>
      )}

      <div id={qrcodeRegionId} className="w-full max-w-sm h-auto aspect-square flex justify-center items-center overflow-hidden bg-gray-900 rounded-md">
        {isCoolingDown && (
          <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center text-white text-lg font-bold">
            Processing Scan... Please Wait.
          </div>
        )}
      </div>

      {/* Removed manual Start/Stop buttons from QrCodeScanner component */}
      {/* because the parent will control `showScanner` state which triggers start/stop */}
    </div>
  );
};

export default QrCodeScanner;
