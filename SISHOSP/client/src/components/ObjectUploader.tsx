import { useState } from "react";
import type { ReactNode } from "react";
import Uppy from "@uppy/core";
import { DashboardModal } from "@uppy/react";
import "@uppy/core/dist/style.min.css";
import "@uppy/dashboard/dist/style.min.css";
import AwsS3 from "@uppy/aws-s3";
import type { UploadResult } from "@uppy/core";
import { Button } from "@/components/ui/button";

interface ObjectUploaderProps {
  maxNumberOfFiles?: number;
  maxFileSize?: number;
  allowedFileTypes?: string[];
  onGetUploadParameters: () => Promise<{
    method: "PUT";
    url: string;
    objectPath: string;
  }>;
  onComplete?: (
    result: UploadResult<Record<string, unknown>, Record<string, unknown>>,
    objectPaths: string[]
  ) => void;
  buttonClassName?: string;
  children: ReactNode;
}

export function ObjectUploader({
  maxNumberOfFiles = 1,
  maxFileSize = 10485760,
  allowedFileTypes,
  onGetUploadParameters,
  onComplete,
  buttonClassName,
  children,
}: ObjectUploaderProps) {
  const [showModal, setShowModal] = useState(false);
  const [objectPaths, setObjectPaths] = useState<string[]>([]);
  
  const [uppy] = useState(() => {
    const uppyInstance = new Uppy({
      restrictions: {
        maxNumberOfFiles,
        maxFileSize,
        allowedFileTypes,
      },
      autoProceed: false,
    })
      .use(AwsS3, {
        shouldUseMultipart: false,
        getUploadParameters: async () => {
          const params = await onGetUploadParameters();
          setObjectPaths(prev => [...prev, params.objectPath]);
          return {
            method: params.method,
            url: params.url,
          };
        },
      })
      .on("complete", (result) => {
        onComplete?.(result, objectPaths);
        setObjectPaths([]);
      });
    
    return uppyInstance;
  });

  return (
    <div>
      <Button onClick={() => setShowModal(true)} className={buttonClassName} type="button">
        {children}
      </Button>

      <DashboardModal
        uppy={uppy}
        open={showModal}
        onRequestClose={() => setShowModal(false)}
        proudlyDisplayPoweredByUppy={false}
        locale={{
          strings: {
            dropPasteFiles: 'Arraste e solte arquivos aqui ou %{browseFiles}',
            browseFiles: 'procure arquivos',
            uploadComplete: 'Upload completo',
            uploadFailed: 'Falha no upload',
            cancel: 'Cancelar',
            done: 'Concluído',
            uploadXFiles: {
              '0': 'Enviar %{smart_count} arquivo',
              '1': 'Enviar %{smart_count} arquivos',
            },
          },
        }}
      />
    </div>
  );
}
