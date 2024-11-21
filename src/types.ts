export interface FileInfo {
    name: string;
    path: string;
    directory: string;
  }
  
  export interface RenameOperation {
    oldPath: string;
    newPath: string;
  }
  
  export interface RenameResult {
    success: boolean;
    oldPath: string;
    newPath?: string;
    error?: string;
  }