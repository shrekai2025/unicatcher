import type { Metadata } from 'next';
import ApiDocsClientPage from './client-page';

export const metadata: Metadata = {
  title: 'API 文档 - UniCatcher',
  description: 'UniCatcher API 接口文档 - 完整的REST API和tRPC接口说明',
};

export default function APIDocsPage() {
  return <ApiDocsClientPage />;
}