export default function Loading() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        {/* 로고 애니메이션 */}
        <div className="relative">
          <div className="w-12 h-12 border-4 border-white/10 rounded-full" />
          <div className="absolute top-0 left-0 w-12 h-12 border-4 border-transparent border-t-purple-500 rounded-full animate-spin shadow-[0_0_15px_rgba(168,85,247,0.5)]" />
        </div>

        {/* 브랜드 텍스트 */}
        <p className="text-sm font-bold text-gray-400 tracking-[0.2em] animate-pulse">
          LOADING
        </p>
      </div>
    </div>
  );
}
