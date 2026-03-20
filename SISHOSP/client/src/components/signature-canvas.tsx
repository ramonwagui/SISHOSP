import { useRef, forwardRef, useImperativeHandle } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RotateCcw } from "lucide-react";

interface SignaturePadProps {
  onSave?: (signature: string) => void;
  width?: number;
  height?: number;
  penColor?: string;
}

export interface SignaturePadRef {
  clear: () => void;
  isEmpty: () => boolean;
  toDataURL: () => string;
}

export const SignaturePad = forwardRef<SignaturePadRef, SignaturePadProps>(
  ({ onSave, width = 600, height = 200, penColor = "#000000" }, ref) => {
    const sigCanvas = useRef<SignatureCanvas>(null);

    useImperativeHandle(ref, () => ({
      clear: () => {
        sigCanvas.current?.clear();
      },
      isEmpty: () => {
        return sigCanvas.current?.isEmpty() ?? true;
      },
      toDataURL: () => {
        const dataURL = sigCanvas.current?.toDataURL() ?? "";
        // Fix format: ensure semicolon between png and base64
        return dataURL.replace('data:image/pngbase64,', 'data:image/png;base64,');
      },
    }));

    const handleClear = () => {
      sigCanvas.current?.clear();
    };

    const handleSave = () => {
      if (sigCanvas.current && !sigCanvas.current.isEmpty()) {
        const dataURL = sigCanvas.current.toDataURL();
        // Fix format: ensure semicolon between png and base64
        const fixedDataURL = dataURL.replace('data:image/pngbase64,', 'data:image/png;base64,');
        onSave?.(fixedDataURL);
      }
    };

    return (
      <div className="space-y-4">
        <Card className="p-4">
          <div className="mb-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Desenhe sua assinatura no espaço abaixo:
            </p>
            <div
              className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden bg-white"
              style={{ width: `${width}px`, height: `${height}px` }}
            >
              <SignatureCanvas
                ref={sigCanvas}
                canvasProps={{
                  width,
                  height,
                  className: "signature-canvas",
                }}
                penColor={penColor}
                backgroundColor="#ffffff"
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={handleClear}
              data-testid="button-clear-signature"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Limpar
            </Button>
            {onSave && (
              <Button
                type="button"
                onClick={handleSave}
                data-testid="button-save-signature"
              >
                Salvar Assinatura
              </Button>
            )}
          </div>
        </Card>

        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Dica:</strong> Use mouse, trackpad ou touch screen para desenhar sua
            assinatura. A assinatura será salva em seu perfil e utilizada para assinar
            documentos médicos automaticamente.
          </p>
        </div>
      </div>
    );
  }
);

SignaturePad.displayName = "SignaturePad";
