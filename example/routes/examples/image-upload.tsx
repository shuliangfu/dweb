/**
 * 图片上传示例页面
 * 演示如何上传图片文件到服务器，支持多文件选择、图片预览等功能
 */

import { useEffect, useRef, useState } from "preact/hooks";
import CodeBlock from "../../components/CodeBlock.tsx";
import type { PageProps } from "@dreamer/dweb";

export const metadata = {
  title: "图片上传示例 - DWeb 框架使用示例",
  description:
    "演示如何上传图片文件到服务器，支持多文件选择、图片预览、上传进度显示等功能",
  keywords: "DWeb, 示例, 图片上传, 文件上传, FormData",
  author: "DWeb",
};

export const renderMode = "csr";

/**
 * 图片上传示例页面组件
 * @param props 页面属性
 * @returns JSX 元素
 */
export default function ImageUploadPage(
  { params: _params, query: _query, data: _data }: PageProps,
) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [uploadResult, setUploadResult] = useState<
    {
      success: boolean;
      message: string;
      files?: Array<
        { filename: string; path: string; size: number; mimeType?: string }
      >;
    } | null
  >(null);
  const [uploadedImages, setUploadedImages] = useState<
    Array<{ filename: string; path: string; size: number; mimeType?: string }>
  >([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const isClearingRef = useRef(false);

  // 组件挂载时从 localStorage 恢复图片
  useEffect(() => {
    try {
      const savedImages = localStorage.getItem("dweb-uploaded-images");
      if (savedImages) {
        const parsed = JSON.parse(savedImages);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setUploadedImages(parsed);
        }
      }
    } catch (error) {
      console.warn("恢复图片失败:", error);
    }
  }, []);

  // 监控 uploadedImages 状态变化，并持久化到 localStorage
  useEffect(() => {
    try {
      if (uploadedImages.length > 0) {
        localStorage.setItem(
          "dweb-uploaded-images",
          JSON.stringify(uploadedImages),
        );
        isClearingRef.current = false;
      } else {
        if (!isClearingRef.current) {
          const saved = localStorage.getItem("dweb-uploaded-images");
          if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setTimeout(() => {
                setUploadedImages(parsed);
              }, 50);
              return;
            }
          }
        }
        localStorage.removeItem("dweb-uploaded-images");
        isClearingRef.current = false;
      }
    } catch (error) {
      console.warn("保存图片到 localStorage 失败:", error);
    }
  }, [uploadedImages]);

  /**
   * 图片上传示例：选择文件
   */
  const handleFileSelect = (e: Event) => {
    const target = e.target as HTMLInputElement;
    const files = Array.from(target.files || []);

    if (files.length === 0) return;

    const imageTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    const validFiles = files.filter((file) => imageTypes.includes(file.type));

    if (validFiles.length !== files.length) {
      setMessage("只能上传图片文件（JPEG、PNG、GIF、WebP）");
      return;
    }

    const maxSize = 10 * 1024 * 1024;
    const sizeValidFiles = validFiles.filter((file) => file.size <= maxSize);

    if (sizeValidFiles.length !== validFiles.length) {
      setMessage("文件大小不能超过 10MB");
      return;
    }

    setSelectedFiles(sizeValidFiles);

    const previewPromises = sizeValidFiles.map((file) => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          resolve(e.target?.result as string);
        };
        reader.readAsDataURL(file);
      });
    });

    Promise.all(previewPromises).then((previewUrls) => {
      setPreviews(previewUrls);
    });
  };

  /**
   * 图片上传示例：上传文件到服务器
   */
  const handleImageUpload = async () => {
    if (selectedFiles.length === 0) {
      setMessage("请先选择图片文件");
      return;
    }

    setLoading(true);
    setMessage("正在上传图片...");

    try {
      const formData = new FormData();
      selectedFiles.forEach((file) => {
        formData.append("file", file);
      });

      const response = await fetch("/api/upload/upload-image", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (result.success && result.data) {
        const files = Array.isArray(result.data) ? result.data : [];
        setMessage(`上传成功！共上传 ${files.length} 个文件`);

        setUploadedImages((prev) => [...prev, ...files]);

        setUploadResult({
          success: true,
          message: result.message || "上传成功",
          files: files,
        });

        setSelectedFiles([]);
        setPreviews([]);
        const fileInput = document.getElementById(
          "image-upload-input",
        ) as HTMLInputElement;
        if (fileInput) {
          fileInput.value = "";
        }

        setTimeout(() => {
          setUploadResult(null);
        }, 3000);
      } else {
        setMessage(result.message || "上传失败");
        setUploadResult({
          success: false,
          message: result.message || "上传失败",
        });
      }
    } catch (error) {
      setMessage(
        `上传失败: ${error instanceof Error ? error.message : String(error)}`,
      );
      setUploadResult({
        success: false,
        message: error instanceof Error ? error.message : "上传失败",
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * 清除已上传的图片列表
   */
  const handleClearUploadedImages = () => {
    isClearingRef.current = true;
    setUploadedImages([]);
    try {
      localStorage.removeItem("dweb-uploaded-images");
    } catch (error) {
      console.warn("清除 localStorage 失败:", error);
    }
  };

  const uploadCode = `// 图片上传示例
import { useState } from 'preact/hooks';

export default function ImageUpload() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);

  const handleUpload = async () => {
    const formData = new FormData();
    selectedFiles.forEach(file => {
      formData.append('file', file);
    });

    setLoading(true);
    try {
      const response = await fetch('/api/upload/upload-image', {
        method: 'POST',
        body: formData,
      });
      const result = await response.json();
      console.log(result);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <input
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          setSelectedFiles(files);
        }}
      />
      <button type="button" onClick={handleUpload} disabled={loading}>
        {loading ? '上传中...' : '上传'}
      </button>
    </div>
  );
}`;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          图片上传示例
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300">
          演示如何上传图片文件到服务器，支持多文件选择、图片预览、上传进度显示等功能。
        </p>
      </div>

      {/* 状态消息 */}
      {message && (
        <div
          className={`p-4 rounded-xl shadow-sm border ${
            message.includes("成功") || message.includes("已")
              ? "bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 border-green-200 dark:border-green-800"
              : message.includes("失败") || message.includes("错误")
              ? "bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 border-red-200 dark:border-red-800"
              : "bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-800"
          }`}
        >
          <span className="font-medium">{message}</span>
        </div>
      )}

      {/* 上传结果提示消息（独立显示，可自动消失） */}
      {uploadResult && (
        <div
          className={`p-4 rounded-xl border animate-fade-in-up ${
            uploadResult.success
              ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
              : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center flex-1">
              {uploadResult.success
                ? (
                  <svg
                    className="w-5 h-5 text-green-600 dark:text-green-400 mr-2 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    >
                    </path>
                  </svg>
                )
                : (
                  <svg
                    className="w-5 h-5 text-red-600 dark:text-red-400 mr-2 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                    >
                    </path>
                  </svg>
                )}
              <p
                className={`font-medium ${
                  uploadResult.success
                    ? "text-green-800 dark:text-green-200"
                    : "text-red-800 dark:text-red-200"
                }`}
              >
                {uploadResult.message}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setUploadResult(null)}
              className="ml-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors shrink-0"
              title="关闭"
              aria-label="关闭提示"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                >
                </path>
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* 文件选择区域 */}
      <div className="bg-white dark:bg-gray-800 p-10 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700">
        <div
          className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center cursor-pointer hover:border-blue-500 transition-colors mb-8"
          onClick={() => document.getElementById("image-upload-input")?.click()}
        >
          <input
            type="file"
            id="image-upload-input"
            multiple
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={handleFileSelect}
            className="hidden"
          />
          <p className="text-gray-500 dark:text-gray-400 text-lg">
            拖拽图片到此处，或{" "}
            <span className="text-blue-600 dark:text-blue-400 font-medium">
              点击选择文件
            </span>
          </p>
          <p className="text-sm text-gray-400 mt-2">
            支持 JPEG, PNG, GIF, WebP 格式，最大 10MB
          </p>
        </div>

        {/* 预览区域 */}
        {previews.length > 0 && (
          <div className="mb-8">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              待上传图片预览 ({selectedFiles.length})
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {previews.map((previewUrl, index) => (
                <div
                  key={index}
                  className="relative bg-gray-100 dark:bg-gray-700 rounded-xl overflow-hidden aspect-square group"
                >
                  <img
                    src={previewUrl}
                    alt={`Preview ${index}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 上传按钮 */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="text-gray-600 dark:text-gray-300 text-sm">
            {selectedFiles.length > 0 && (
              <span>
                总大小: {(
                  selectedFiles.reduce((sum, file) => sum + file.size, 0) /
                  1024 / 1024
                ).toFixed(2)} MB
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={handleImageUpload}
            disabled={loading || selectedFiles.length === 0}
            className={`px-8 py-4 rounded-xl transition-all shadow-lg font-bold text-lg flex items-center justify-center min-w-[160px] ${
              !loading && selectedFiles.length > 0 ? "hover:shadow-xl" : ""
            }`}
            style={{
              backgroundColor: loading || selectedFiles.length === 0
                ? "#9ca3af"
                : "#16a34a",
              color: "#ffffff",
              border: "none",
              cursor: loading || selectedFiles.length === 0
                ? "not-allowed"
                : "pointer",
              opacity: loading || selectedFiles.length === 0 ? 0.6 : 1,
            }}
          >
            {loading
              ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5"
                    style={{ color: "#ffffff" }}
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    >
                    </circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    >
                    </path>
                  </svg>
                  <span style={{ color: "#ffffff" }}>上传中...</span>
                </>
              )
              : (
                <>
                  <svg
                    className="w-5 h-5 mr-2"
                    style={{ color: "#ffffff" }}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    >
                    </path>
                  </svg>
                  <span style={{ color: "#ffffff" }}>上传图片</span>
                </>
              )}
          </button>
        </div>
      </div>

      {/* 已上传的图片列表（独立显示，持续存在） */}
      {uploadedImages.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              已上传的图片 ({uploadedImages.length})
            </h3>
            <button
              type="button"
              onClick={handleClearUploadedImages}
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
              title="清除所有图片"
            >
              清除全部
            </button>
          </div>

          {/* 图片预览网格 */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {uploadedImages.map((file, index) => {
              const isImage = file.mimeType?.startsWith("image/") ||
                /\.(jpg|jpeg|png|gif|webp|avif)$/i.test(file.filename);
              let imageUrl = file.path;
              if (imageUrl.startsWith("./")) {
                imageUrl = imageUrl.slice(2);
              }
              if (!imageUrl.startsWith("/")) {
                imageUrl = `/${imageUrl}`;
              }

              return (
                <div
                  key={`img-${file.path}-${index}`}
                  className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow"
                >
                  {isImage
                    ? (
                      <div className="aspect-square bg-gray-100 dark:bg-gray-700 relative group">
                        <img
                          src={imageUrl}
                          alt={file.filename}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          key={`img-src-${imageUrl}`}
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = "none";
                            const placeholder = target.parentElement
                              ?.querySelector(".image-placeholder");
                            if (placeholder) {
                              (placeholder as HTMLElement).style.display =
                                "flex";
                            }
                          }}
                        />
                        <div
                          className="image-placeholder absolute inset-0 flex items-center justify-center text-gray-400 dark:text-gray-500"
                          style={{ display: "none" }}
                        >
                          <svg
                            className="w-12 h-12"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                            >
                            </path>
                          </svg>
                        </div>
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <a
                            href={imageUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-white text-sm font-medium px-3 py-1 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            查看原图
                          </a>
                        </div>
                      </div>
                    )
                    : (
                      <div className="aspect-square bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                        <svg
                          className="w-12 h-12 text-gray-400 dark:text-gray-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                          >
                          </path>
                        </svg>
                      </div>
                    )}
                  <div className="p-3">
                    <p
                      className="text-xs font-medium text-gray-900 dark:text-white truncate mb-1"
                      title={file.filename}
                    >
                      {file.filename}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 代码示例 */}
      <CodeBlock
        code={uploadCode}
        language="typescript"
        title="图片上传代码示例"
      />
    </div>
  );
}
