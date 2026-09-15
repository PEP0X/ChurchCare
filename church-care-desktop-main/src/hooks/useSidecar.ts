import { useState, useCallback } from "react";
import { CaseStudyData } from "../types/schema";
import { DocumentLayout } from "../types/layout";

export interface GeneratePdfResult {
  status: "success" | "error";
  outputPath?: string;
  pages?: number;
  sizeBytes?: number;
  errorMessage?: string;
}

export function useSidecar() {
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [lastResult, setLastResult] = useState<GeneratePdfResult | null>(null);

  const generatePdf = useCallback(
    async (
      data: CaseStudyData,
      outputPath: string,
      templatePath?: string,
      layout?: DocumentLayout
    ): Promise<GeneratePdfResult> => {
      setIsGenerating(true);
      setLastResult(null);

      try {
        // Check if running inside Tauri v2 environment
        const isTauri =
          typeof window !== "undefined" &&
          ("__TAURI_INTERNALS__" in window || "__TAURI__" in window);

        if (isTauri) {
          const payload = {
            jsonrpc: "2.0",
            id: Date.now(),
            method: "generate_pdf",
            params: {
              output_path: outputPath,
              template_path: templatePath,
              data: data,
              layout: layout,
              husband_id_image: data.husband_id_image,
              husband_id_back_image: data.husband_id_back_image,
              wife_id_image: data.wife_id_image,
              wife_id_back_image: data.wife_id_back_image
            }
          };

          try {
            // 1. First priority: Direct Rust backend invoke (fast, rock solid, zero shell permission issues)
            const { invoke } = await import("@tauri-apps/api/core");
            const responseStr = await invoke<string>("generate_pdf_engine", {
              payload: JSON.stringify(payload)
            });

            const res = JSON.parse(responseStr);
            if (res.result && res.result.status === "success") {
              const result: GeneratePdfResult = {
                status: "success",
                outputPath: res.result.output_path,
                pages: res.result.pages,
                sizeBytes: res.result.size_bytes
              };
              setLastResult(result);
              setIsGenerating(false);
              return result;
            } else if (res.error) {
              const errResult: GeneratePdfResult = {
                status: "error",
                errorMessage: res.error.message || "حدث خطأ في محرك الطباعة"
              };
              setLastResult(errResult);
              setIsGenerating(false);
              return errResult;
            } else {
              throw new Error("تنسيق استجابة غير صالح من المحرك");
            }
          } catch (invokeErr: any) {
            console.warn("Direct invoke fallback to plugin-shell:", invokeErr);

            // 2. Second priority: Fallback to plugin-shell sidecar
            try {
              const { Command } = await import("@tauri-apps/plugin-shell");
              const command = Command.sidecar("binaries/engine");

              return await new Promise<GeneratePdfResult>((resolve) => {
                let isHandled = false;

                command.stdout.on("data", (line: string) => {
                  try {
                    const res = JSON.parse(line.trim());
                    if (res.result && res.result.status === "success") {
                      isHandled = true;
                      const result: GeneratePdfResult = {
                        status: "success",
                        outputPath: res.result.output_path,
                        pages: res.result.pages,
                        sizeBytes: res.result.size_bytes
                      };
                      setLastResult(result);
                      setIsGenerating(false);
                      resolve(result);
                    } else if (res.error) {
                      isHandled = true;
                      const errResult: GeneratePdfResult = {
                        status: "error",
                        errorMessage: res.error.message
                      };
                      setLastResult(errResult);
                      setIsGenerating(false);
                      resolve(errResult);
                    }
                  } catch (e) {}
                });

                command.stderr.on("data", (errLine: string) => {
                  console.warn("[Sidecar STDERR]:", errLine);
                });

                command
                  .spawn()
                  .then(async (child) => {
                    await child.write(JSON.stringify(payload) + "\n");
                  })
                  .catch((spawnErr) => {
                    if (!isHandled) {
                      const errResult: GeneratePdfResult = {
                        status: "error",
                        errorMessage: invokeErr?.message || spawnErr?.message || "فشل الاتصال بمحرك Python"
                      };
                      setLastResult(errResult);
                      setIsGenerating(false);
                      resolve(errResult);
                    }
                  });

                // Safety timeout: 25 seconds
                setTimeout(() => {
                  if (!isHandled) {
                    const timeoutResult: GeneratePdfResult = {
                      status: "error",
                      errorMessage: "استغرق استخراج ملف الـ PDF وقتاً أطول من المتوقع"
                    };
                    setLastResult(timeoutResult);
                    setIsGenerating(false);
                    resolve(timeoutResult);
                  }
                }, 25000);
              });
            } catch (shellErr: any) {
              throw new Error(invokeErr?.message || shellErr?.message || "فشل تشغيل محرك الـ PDF");
            }
          }
        } else {
          // Fallback simulation in Web browser dev mode
          console.log("[Dev Mode] Generating PDF with data:", data);
          await new Promise((r) => setTimeout(r, 1200));

          const mockResult: GeneratePdfResult = {
            status: "success",
            outputPath: outputPath || "/Users/saitama/Downloads/بحث_أخوة_الرب_القلب_المتسع_2026.pdf",
            pages: 6,
            sizeBytes: 945000
          };
          setLastResult(mockResult);
          setIsGenerating(false);
          return mockResult;
        }
      } catch (err: any) {
        const errorResult: GeneratePdfResult = {
          status: "error",
          errorMessage: err.message || "فشل الاتصال بمحرك الـ PDF"
        };
        setLastResult(errorResult);
        setIsGenerating(false);
        return errorResult;
      }
    },
    []
  );

  return {
    generatePdf,
    isGenerating,
    lastResult
  };
}
