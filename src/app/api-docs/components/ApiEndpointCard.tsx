'use client';

import { useState } from 'react';
import type { ApiEndpoint } from '../types';

export function ApiEndpointCard({ endpoint }: { endpoint: ApiEndpoint }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const methodColors = {
    GET: 'bg-green-100 text-green-800',
    POST: 'bg-blue-100 text-blue-800',
    PUT: 'bg-yellow-100 text-yellow-800',
    DELETE: 'bg-red-100 text-red-800'
  };

  // 生成Markdown格式的API文档
  const generateMarkdown = () => {
    let markdown = `# ${endpoint.title}\n\n`;
    markdown += `**${endpoint.method}** \`${endpoint.path}\`\n\n`;
    markdown += `${endpoint.description}\n\n`;

    // 路径参数
    if (endpoint.pathParams && endpoint.pathParams.length > 0) {
      markdown += `## 路径参数\n\n`;
      markdown += `| 参数名 | 类型 | 必填 | 说明 | 示例 |\n`;
      markdown += `|--------|------|------|------|------|\n`;
      endpoint.pathParams.forEach(param => {
        const example = typeof param.example === 'object' ? JSON.stringify(param.example) : param.example;
        markdown += `| ${param.name} | ${param.type} | ${param.required ? '是' : '否'} | ${param.description} | ${example} |\n`;
      });
      markdown += `\n`;
    }

    // 查询参数
    if (endpoint.queryParams && endpoint.queryParams.length > 0) {
      markdown += `## 查询参数\n\n`;
      markdown += `| 参数名 | 类型 | 必填 | 可选值 | 说明 | 示例 |\n`;
      markdown += `|--------|------|------|--------|------|------|\n`;
      endpoint.queryParams.forEach(param => {
        const options = param.options ? param.options.join(', ') : '-';
        const example = typeof param.example === 'object' ? JSON.stringify(param.example) : param.example;
        markdown += `| ${param.name} | ${param.type} | ${param.required ? '是' : '否'} | ${options} | ${param.description} | ${example} |\n`;
      });
      markdown += `\n`;
    }

    // 请求参数
    if (endpoint.params && endpoint.params.length > 0) {
      markdown += `## 请求参数\n\n`;
      markdown += `| 参数名 | 类型 | 必填 | 可选值 | 说明 | 示例 |\n`;
      markdown += `|--------|------|------|--------|------|------|\n`;
      endpoint.params.forEach(param => {
        const options = param.options ? param.options.join(', ') : '-';
        const example = typeof param.example === 'object' ? JSON.stringify(param.example) : param.example;
        markdown += `| ${param.name} | ${param.type} | ${param.required ? '是' : '否'} | ${options} | ${param.description} | ${example} |\n`;
      });
      markdown += `\n`;
    }

    // 响应示例
    markdown += `## 响应示例\n\n`;
    endpoint.responses.forEach(response => {
      markdown += `### ${response.status} - ${response.description}\n\n`;
      markdown += `\`\`\`json\n${JSON.stringify(response.example, null, 2)}\n\`\`\`\n\n`;
    });

    // cURL示例
    markdown += `## cURL 示例\n\n`;
    markdown += `\`\`\`bash\n${endpoint.example}\n\`\`\`\n\n`;

    return markdown;
  };

  // 复制到剪贴板
  const copyToClipboard = async (e: React.MouseEvent) => {
    e.stopPropagation(); // 防止触发展开/收起
    try {
      const markdown = generateMarkdown();
      await navigator.clipboard.writeText(markdown);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg mb-4">
      {/* 折叠头部 */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-3">
          <span className={`inline-block px-3 py-1 text-sm font-semibold rounded ${methodColors[endpoint.method]}`}>
            {endpoint.method}
          </span>
          <code className="text-lg font-mono text-gray-800">{endpoint.path}</code>
          <span className="text-gray-600">- {endpoint.title}</span>
        </div>
        <div className="flex items-center space-x-2">
          {/* 复制按钮 */}
          <button
            onClick={copyToClipboard}
            className={`p-2 rounded-md transition-colors ${
              copySuccess
                ? 'bg-green-100 text-green-600 hover:bg-green-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            title="复制Markdown文档"
          >
            {copySuccess ? (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            )}
          </button>

          <svg
            className={`h-5 w-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>

      {/* 展开内容 */}
      {isExpanded && (
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <p className="text-gray-600 mb-6">{endpoint.description}</p>

          {/* 路径参数 */}
          {endpoint.pathParams && endpoint.pathParams.length > 0 && (
            <div className="mb-6">
              <h4 className="font-medium text-gray-800 mb-3">🔗 路径参数</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-200 rounded">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">参数名</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">类型</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">必填</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">说明</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">示例</th>
                    </tr>
                  </thead>
                  <tbody>
                    {endpoint.pathParams.map((param, index) => (
                      <tr key={index} className="border-t border-gray-200">
                        <td className="px-4 py-2 font-mono text-sm">{param.name}</td>
                        <td className="px-4 py-2 text-sm text-blue-600">{param.type}</td>
                        <td className="px-4 py-2 text-sm">
                          {param.required ? (
                            <span className="text-red-600 font-medium">必填</span>
                          ) : (
                            <span className="text-gray-500">可选</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-700">{param.description}</td>
                        <td className="px-4 py-2 text-sm font-mono text-gray-600">
                          {typeof param.example === 'object' ? JSON.stringify(param.example) : param.example}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 查询参数 */}
          {endpoint.queryParams && endpoint.queryParams.length > 0 && (
            <div className="mb-6">
              <h4 className="font-medium text-gray-800 mb-3">🔍 查询参数</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-200 rounded">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">参数名</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">类型</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">必填</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">可选值</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">说明</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">示例</th>
                    </tr>
                  </thead>
                  <tbody>
                    {endpoint.queryParams.map((param, index) => (
                      <tr key={index} className="border-t border-gray-200">
                        <td className="px-4 py-2 font-mono text-sm">{param.name}</td>
                        <td className="px-4 py-2 text-sm text-blue-600">{param.type}</td>
                        <td className="px-4 py-2 text-sm">
                          {param.required ? (
                            <span className="text-red-600 font-medium">必填</span>
                          ) : (
                            <span className="text-gray-500">可选</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-sm">
                          {param.options ? (
                            <div className="flex flex-wrap gap-1">
                              {param.options.map((option, i) => (
                                <span key={i} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                                  {option}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-700">{param.description}</td>
                        <td className="px-4 py-2 text-sm font-mono text-gray-600">
                          {typeof param.example === 'object' ? JSON.stringify(param.example) : param.example}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 请求参数 */}
          {endpoint.params && endpoint.params.length > 0 && (
            <div className="mb-6">
              <h4 className="font-medium text-gray-800 mb-3">📝 请求参数</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-200 rounded">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">参数名</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">类型</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">必填</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">可选值</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">说明</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">示例</th>
                    </tr>
                  </thead>
                  <tbody>
                    {endpoint.params.map((param, index) => (
                      <tr key={index} className="border-t border-gray-200">
                        <td className="px-4 py-2 font-mono text-sm">{param.name}</td>
                        <td className="px-4 py-2 text-sm text-blue-600">{param.type}</td>
                        <td className="px-4 py-2 text-sm">
                          {param.required ? (
                            <span className="text-red-600 font-medium">必填</span>
                          ) : (
                            <span className="text-gray-500">可选</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-sm">
                          {param.options ? (
                            <div className="flex flex-wrap gap-1">
                              {param.options.map((option, i) => (
                                <span key={i} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                                  {option}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-700">{param.description}</td>
                        <td className="px-4 py-2 text-sm font-mono text-gray-600">
                          {typeof param.example === 'object' ? JSON.stringify(param.example) : param.example}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 响应示例 */}
          <div className="mb-6">
            <h4 className="font-medium text-gray-800 mb-3">📤 响应示例</h4>
            <div className="space-y-6">
              {endpoint.responses.map((response, index) => (
                <div key={index}>
                  <div className="flex items-center space-x-2 mb-2">
                    <span className={`px-2 py-1 text-xs font-semibold rounded ${
                      response.status < 300 ? 'bg-green-100 text-green-800' : 
                      response.status < 400 ? 'bg-yellow-100 text-yellow-800' : 
                      'bg-red-100 text-red-800'
                    }`}>
                      {response.status}
                    </span>
                    <span className="text-sm text-gray-600">{response.description}</span>
                  </div>
                  
                  {/* 响应字段说明 */}
                  {response.fields && response.fields.length > 0 && (
                    <div className="mb-4">
                      <h5 className="font-medium text-gray-700 mb-2">响应字段说明</h5>
                      <div className="overflow-x-auto">
                        <table className="min-w-full bg-white border border-gray-200 rounded">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">字段名</th>
                              <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">类型</th>
                              <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">说明</th>
                              <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">示例</th>
                            </tr>
                          </thead>
                          <tbody>
                            {response.fields.map((field, fieldIndex) => (
                              <tr key={fieldIndex} className="border-t border-gray-200">
                                <td className="px-4 py-2 font-mono text-sm">{field.name}</td>
                                <td className="px-4 py-2 text-sm text-blue-600">{field.type}</td>
                                <td className="px-4 py-2 text-sm text-gray-700">{field.description}</td>
                                <td className="px-4 py-2 text-sm font-mono text-gray-600">
                                  {typeof field.example === 'object' ? JSON.stringify(field.example) : field.example}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                  
                  {/* JSON示例 */}
                  <div className="bg-gray-900 text-gray-100 p-3 rounded text-sm overflow-x-auto">
                    <pre>{JSON.stringify(response.example, null, 2)}</pre>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* cURL示例 */}
          <div>
            <h4 className="font-medium text-gray-800 mb-3">💻 cURL 示例</h4>
            <div className="bg-gray-900 text-gray-100 p-3 rounded text-sm overflow-x-auto">
              <pre>{endpoint.example}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
