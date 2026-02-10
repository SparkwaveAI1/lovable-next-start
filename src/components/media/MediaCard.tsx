import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { Download, Pencil, Trash2, Calendar, HardDrive, Play, Video, Image as ImageIcon, Share2 } from "lucide-react"
import { StatusBadge } from "@/components/ui/status-badge"

interface MediaCardProps {
  id: string
  title: string
  description?: string
  thumbnailUrl?: string
  filePath: string
  fileType: "image" | "video"
  createdAt: string
  fileSize: string
  dimensions?: string
  tags: string[]
  isAnalyzing?: boolean
  onDownload?: () => void
  onShare?: () => void
  onEdit?: () => void
  onDelete?: () => void
  onClick?: () => void
  className?: string
}

export function MediaCard({
  title,
  description,
  thumbnailUrl,
  filePath,
  fileType,
  createdAt,
  fileSize,
  dimensions,
  tags,
  isAnalyzing = false,
  onDownload,
  onShare,
  onEdit,
  onDelete,
  onClick,
  className,
}: MediaCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [thumbLoaded, setThumbLoaded] = useState(false)
  const [thumbError, setThumbError] = useState(false)

  // Reset loading state when filePath or thumbnailUrl changes
  useEffect(() => {
    setImageLoaded(false)
    setImageError(false)
  }, [filePath])

  useEffect(() => {
    setThumbLoaded(false)
    setThumbError(false)
  }, [thumbnailUrl])

  return (
    <Card
      variant="interactive"
      className={cn("overflow-hidden group cursor-pointer", className)}
      onClick={onClick}
    >
      {/* Thumbnail with fixed aspect ratio */}
      <div className="relative aspect-video bg-gray-100 overflow-hidden">
        {fileType === "image" ? (
          <>
            {/* Loading/Error fallback */}
            {(!imageLoaded || imageError) && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                <ImageIcon className="w-12 h-12 text-gray-400" />
                {imageError && <span className="text-xs text-gray-400 mt-1">Failed to load</span>}
              </div>
            )}
            <img
              src={filePath}
              alt={title}
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
              className={cn(
                "w-full h-full object-contain transition-transform duration-300 group-hover:scale-105",
                (!imageLoaded || imageError) && "opacity-0"
              )}
            />
          </>
        ) : fileType === "video" ? (
          <div className="relative w-full h-full">
            {thumbnailUrl ? (
              <>
                {/* Loading/Error fallback for video thumbnail */}
                {(!thumbLoaded || thumbError) && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                    <Video className="w-12 h-12 text-gray-400" />
                    {thumbError && <span className="text-xs text-gray-400 mt-1">Thumbnail unavailable</span>}
                  </div>
                )}
                <img
                  src={thumbnailUrl}
                  alt={title}
                  onLoad={() => setThumbLoaded(true)}
                  onError={() => setThumbError(true)}
                  className={cn(
                    "w-full h-full object-contain transition-transform duration-300 group-hover:scale-105",
                    (!thumbLoaded || thumbError) && "opacity-0"
                  )}
                />
              </>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                <Video className="w-12 h-12 text-gray-400" />
              </div>
            )}
            {/* Play button overlay for videos */}
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
              <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                <Play className="w-7 h-7 text-gray-900 ml-1" fill="currentColor" />
              </div>
            </div>
          </div>
        ) : null}

        {/* Hover overlay with actions */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
          {onDownload && (
            <button
              onClick={(e) => { e.stopPropagation(); onDownload(); }}
              className="p-2 bg-white rounded-lg shadow-lg hover:bg-gray-100 transition-colors"
              title="Download"
            >
              <Download className="h-4 w-4 text-gray-700" />
            </button>
          )}
          {onShare && (
            <button
              onClick={(e) => { e.stopPropagation(); onShare(); }}
              className="p-2 bg-white rounded-lg shadow-lg hover:bg-gray-100 transition-colors"
              title="Share"
            >
              <Share2 className="h-4 w-4 text-gray-700" />
            </button>
          )}
          {onEdit && (
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              className="p-2 bg-white rounded-lg shadow-lg hover:bg-gray-100 transition-colors"
            >
              <Pencil className="h-4 w-4 text-gray-700" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="p-2 bg-white rounded-lg shadow-lg hover:bg-red-50 transition-colors"
            >
              <Trash2 className="h-4 w-4 text-red-600" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        <div>
          <h3 className="font-semibold text-gray-900 truncate">{title}</h3>
          {isAnalyzing ? (
            <div className="mt-1">
              <StatusBadge variant="info" size="sm">
                AI analyzing...
              </StatusBadge>
            </div>
          ) : description ? (
            <p className="text-sm text-gray-500 line-clamp-2 mt-1">
              {description}
            </p>
          ) : null}
        </div>

        {/* Metadata */}
        <div className="flex items-center gap-4 text-xs text-gray-400">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>{createdAt}</span>
          </div>
          <div className="flex items-center gap-1">
            <HardDrive className="h-3 w-3" />
            <span>{fileSize}</span>
          </div>
          {dimensions && (
            <span>{dimensions}</span>
          )}
        </div>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {tags.slice(0, 3).map((tag) => (
              <StatusBadge key={tag} variant="neutral" size="sm">
                {tag}
              </StatusBadge>
            ))}
            {tags.length > 3 && (
              <StatusBadge variant="neutral" size="sm">
                +{tags.length - 3}
              </StatusBadge>
            )}
          </div>
        )}
      </div>
    </Card>
  )
}
