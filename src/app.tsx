import React, { useState } from "react";
import { FileInfo, RenameOperation, RenameResult } from "./types";
const { ipcRenderer } = window.require("electron");
const path = window.require("path");

interface RenamePreview {
  oldPath: string;
  newPath: string;
  oldName: string;
  newName: string;
}

const App: React.FC = () => {
  const [folderPath, setFolderPath] = useState("");
  const [includeNested, setIncludeNested] = useState(false);
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [searchString, setSearchString] = useState("");
  const [replaceString, setReplaceString] = useState("");
  const [position, setPosition] = useState<"start" | "end" | "replace">(
    "replace"
  );
  const [previews, setPreviews] = useState<RenamePreview[]>([]);

  const selectFolder = async () => {
    const selectedPath = await ipcRenderer.invoke("select-folder");
    if (selectedPath) {
      setFolderPath(selectedPath);
      // Automatically load files when folder is selected
      const loadedFiles = await ipcRenderer.invoke(
        "list-files",
        selectedPath,
        includeNested
      );
      setFiles(loadedFiles);
      generatePreviews(loadedFiles);
    }
  };

  const loadFiles = async () => {
    if (!folderPath) return;
    const loadedFiles = await ipcRenderer.invoke(
      "list-files",
      folderPath,
      includeNested
    );
    setFiles(loadedFiles);
    generatePreviews(loadedFiles);
  };

  const generatePreviews = (currentFiles: FileInfo[]) => {
    const newPreviews = currentFiles.map((file) => {
      let newName = file.name;
      const ext = path.extname(file.name);
      const nameWithoutExt = path.basename(file.name, ext);

      switch (position) {
        case "start":
          newName = searchString + nameWithoutExt + ext;
          break;
        case "end":
          newName = nameWithoutExt + searchString + ext;
          break;
        case "replace":
          newName = nameWithoutExt.replace(searchString, replaceString) + ext;
          break;
      }

      return {
        oldPath: file.path,
        newPath: path.join(file.directory, newName),
        oldName: file.name,
        newName,
      };
    });

    setPreviews(newPreviews);
  };

  const applyChanges = async () => {
    const changes: RenameOperation[] = previews
      .filter((p) => p.oldName !== p.newName)
      .map((p) => ({
        oldPath: p.oldPath,
        newPath: p.newPath,
      }));

    const results = (await ipcRenderer.invoke(
      "rename-files",
      changes
    )) as RenameResult[];

    if (results.every((r: RenameResult) => r.success)) {
      loadFiles();
    } else {
      alert("Some files could not be renamed. Check console for details.");
      console.error(
        "Failed operations:",
        results.filter((r: RenameResult) => !r.success)
      );
    }
  };

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center">
        <input
          type="text"
          placeholder="Selected folder path"
          className="p-2 border rounded mr-2 flex-1"
          value={folderPath}
          readOnly
        />
        <button
          className="bg-blue-500 text-white px-4 py-2 rounded mr-2"
          onClick={selectFolder}
        >
          Select Folder
        </button>
        <label className="flex items-center">
          <input
            type="checkbox"
            className="mr-2"
            checked={includeNested}
            onChange={(e) => {
              setIncludeNested(e.target.checked);
              if (folderPath) {
                loadFiles();
              }
            }}
          />
          Include nested folders
        </label>
      </div>

      {files.length > 0 && (
        <>
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search string"
              className="p-2 border rounded mr-2"
              value={searchString}
              onChange={(e) => {
                setSearchString(e.target.value);
                generatePreviews(files);
              }}
            />
            <input
              type="text"
              placeholder="Replace string"
              className="p-2 border rounded mr-2"
              value={replaceString}
              onChange={(e) => {
                setReplaceString(e.target.value);
                generatePreviews(files);
              }}
            />
            <select
              className="p-2 border rounded"
              value={position}
              onChange={(e) => {
                setPosition(e.target.value as "start" | "end" | "replace");
                generatePreviews(files);
              }}
            >
              <option value="start">Add to start</option>
              <option value="end">Add to end</option>
              <option value="replace">Replace</option>
            </select>
          </div>

          <div className="mb-4">
            <h2 className="text-xl font-bold mb-2">
              Preview ({files.length} files)
            </h2>
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="border p-2">Original Name</th>
                  <th className="border p-2">New Name</th>
                </tr>
              </thead>
              <tbody>
                {previews.map((preview, index) => (
                  <tr
                    key={index}
                    className={
                      preview.oldName !== preview.newName ? "bg-yellow-100" : ""
                    }
                  >
                    <td className="border p-2">{preview.oldName}</td>
                    <td className="border p-2">{preview.newName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            className="bg-green-500 text-white px-4 py-2 rounded"
            onClick={applyChanges}
            disabled={!previews.some((p) => p.oldName !== p.newName)}
          >
            Apply Changes
          </button>
        </>
      )}
    </div>
  );
};

export default App;
