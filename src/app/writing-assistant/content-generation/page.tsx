'use client';


export default function ContentGenerationPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">内容生成</h1>
          <p className="mt-2 text-sm text-gray-600">
            AI辅助内容生成工具
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-24 w-24 rounded-full bg-blue-50 mb-4">
              <span className="text-2xl">📝</span>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">内容生成功能开发中</h3>
            <p className="text-gray-500">
              该模块正在开发中，敬请期待！
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}