declare module 'pdfmake/build/pdfmake' {
  import { TDocumentDefinitions } from 'pdfmake/interfaces';
  
  interface PdfMake {
    vfs: any;
    createPdf(docDefinition: TDocumentDefinitions): {
      download(filename: string): void;
      open(): void;
      getBlob(callback: (blob: Blob) => void): void;
      getDataUrl(callback: (dataUrl: string) => void): void;
    };
  }
  
  const pdfMake: PdfMake;
  export default pdfMake;
}

declare module 'pdfmake/build/vfs_fonts' {
  const pdfMake: {
    pdfMake?: {
      vfs: any;
    };
    [key: string]: any;
  };
  export = pdfMake;
}

declare module 'pdfmake/interfaces' {
  export interface Content {
    text?: string | any[] | Content[];
    stack?: Content[];
    table?: {
      widths?: (string | number)[];
      body?: any[][];
      layout?: {
        defaultBorder?: boolean;
        paddingLeft?: (i: number, node: any) => number;
        paddingRight?: (i: number, node: any) => number;
        paddingTop?: (i: number, node: any) => number;
        paddingBottom?: (i: number, node: any) => number;
        [key: string]: any;
      };
      [key: string]: any;
    };
    ul?: any[];
    ol?: any[];
    style?: string | string[];
    fontSize?: number;
    bold?: boolean;
    italics?: boolean;
    color?: string;
    background?: string;
    fillColor?: string;
    link?: string;
    decoration?: string;
    font?: string;
    margin?: number | [number, number] | [number, number, number, number];
    alignment?: 'left' | 'center' | 'right' | 'justify';
    layout?: {
      defaultBorder?: boolean;
      paddingLeft?: (i: number, node: any) => number;
      paddingRight?: (i: number, node: any) => number;
      paddingTop?: (i: number, node: any) => number;
      paddingBottom?: (i: number, node: any) => number;
      [key: string]: any;
    };
    [key: string]: any;
  }

  export interface TDocumentDefinitions {
    content: Content[];
    styles?: Record<string, Partial<Content>>;
    defaultStyle?: Partial<Content>;
    pageSize?: string | [number, number];
    pageMargins?: number | [number, number] | [number, number, number, number];
    orientation?: 'portrait' | 'landscape';
  }
}

