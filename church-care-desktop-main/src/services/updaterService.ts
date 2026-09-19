/**
 * In-App Auto-Update Service for ChurchCare Desktop
 * Powered by Tauri v2 Updater Plugin & GitHub Releases
 */

export interface UpdateCheckResult {
  available: boolean;
  currentVersion: string;
  version?: string;
  date?: string;
  body?: string;
  error?: string;
  updateHandle?: any;
}

export interface UpdateDownloadProgress {
  status: "pending" | "downloading" | "installing" | "done" | "error";
  downloadedBytes: number;
  totalBytes: number;
  percentage: number;
  error?: string;
}

const isTauriEnv = (): boolean => {
  return (
    typeof window !== "undefined" &&
    ("__TAURI_INTERNALS__" in window || "__TAURI__" in window)
  );
};

/**
 * Checks for available updates from GitHub Releases
 */
export async function checkForAppUpdates(): Promise<UpdateCheckResult> {
  if (!isTauriEnv()) {
    return {
      available: false,
      currentVersion: "1.1.0",
      error: "ميزة التحديث التلقائي متاحة فقط في تطبيق سطح المكتب."
    };
  }

  try {
    const { check } = await import("@tauri-apps/plugin-updater");
    const update = await check();

    if (update && update.available) {
      return {
        available: true,
        currentVersion: update.currentVersion,
        version: update.version,
        date: update.date,
        body: update.body || "يتضمن هذا الإصدار تحسينات جديدة وإصلاحات مهمة.",
        updateHandle: update
      };
    }

    return {
      available: false,
      currentVersion: update?.currentVersion || "1.1.0"
    };
  } catch (err: any) {
    console.warn("Auto-update check failed:", err);
    return {
      available: false,
      currentVersion: "1.1.0",
      error: err?.message || String(err)
    };
  }
}

/**
 * Downloads and installs the pending update with real-time progress callbacks
 */
export async function downloadAndInstallAppUpdate(
  updateHandle: any,
  onProgress?: (progress: UpdateDownloadProgress) => void
): Promise<{ success: boolean; error?: string }> {
  if (!updateHandle) {
    return { success: false, error: "لا يوجد تحديث نشط للتثبيت." };
  }

  try {
    let downloadedBytes = 0;
    let totalBytes = 0;

    await updateHandle.downloadAndInstall((event: any) => {
      if (!onProgress) return;

      switch (event.event) {
        case "Started":
          totalBytes = event.data.contentLength || 0;
          downloadedBytes = 0;
          onProgress({
            status: "downloading",
            downloadedBytes: 0,
            totalBytes,
            percentage: 0
          });
          break;

        case "Progress":
          downloadedBytes += event.data.chunkLength || 0;
          const pct = totalBytes > 0 ? Math.min(100, Math.round((downloadedBytes / totalBytes) * 100)) : 0;
          onProgress({
            status: "downloading",
            downloadedBytes,
            totalBytes,
            percentage: pct
          });
          break;

        case "Finished":
          onProgress({
            status: "installing",
            downloadedBytes,
            totalBytes,
            percentage: 100
          });
          break;
      }
    });

    if (onProgress) {
      onProgress({
        status: "done",
        downloadedBytes,
        totalBytes,
        percentage: 100
      });
    }

    return { success: true };
  } catch (err: any) {
    console.error("Update install error:", err);
    if (onProgress) {
      onProgress({
        status: "error",
        downloadedBytes: 0,
        totalBytes: 0,
        percentage: 0,
        error: err?.message || String(err)
      });
    }
    return { success: false, error: err?.message || String(err) };
  }
}

/**
 * Restarts the application cleanly to launch the newly installed update
 */
export async function relaunchApp(): Promise<void> {
  if (!isTauriEnv()) return;
  try {
    const { relaunch } = await import("@tauri-apps/plugin-process");
    await relaunch();
  } catch (err) {
    console.error("Relaunch failed:", err);
  }
}
