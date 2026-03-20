import { User as UserIcon } from "lucide-react";

interface ProfilePhotoProps {
  userId: string;
  userName: string;
  size?: "sm" | "md" | "lg";
  filePath?: string | null;
}

export function ProfilePhoto({ userId, userName, size = "md", filePath }: ProfilePhotoProps) {
  const sizeClasses = {
    sm: "w-10 h-10",
    md: "w-16 h-16",
    lg: "w-24 h-24"
  };

  const iconSizes = {
    sm: "h-5 w-5",
    md: "h-8 w-8",
    lg: "h-12 w-12"
  };

  // If no photo, show default icon
  if (!filePath) {
    return (
      <div className={`${sizeClasses[size]} rounded-full bg-gray-200 flex items-center justify-center border border-gray-200`}>
        <UserIcon className={`${iconSizes[size]} text-gray-400`} />
      </div>
    );
  }

  // Display Base64 image directly
  return (
    <img 
      src={filePath} 
      alt={userName}
      className={`${sizeClasses[size]} rounded-full object-cover border border-gray-200`}
      onError={(e) => {
        console.error('Image load error for user:', userName);
        e.currentTarget.style.display = 'none';
      }}
    />
  );
}
