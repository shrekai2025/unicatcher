export interface ApiEndpoint {
  id: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  title: string;
  description: string;
  params?: {
    name: string;
    type: string;
    required: boolean;
    description: string;
    options?: string[];
    example?: any;
  }[];
  pathParams?: {
    name: string;
    type: string;
    required: boolean;
    description: string;
    example?: any;
  }[];
  queryParams?: {
    name: string;
    type: string;
    required: boolean;
    description: string;
    options?: string[];
    example?: any;
  }[];
  responses: {
    status: number;
    description: string;
    example: any;
    fields?: {
      name: string;
      type: string;
      description: string;
      example?: any;
    }[];
  }[];
  example: string;
}