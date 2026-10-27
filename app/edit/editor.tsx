"use client";
import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import Editor from "@monaco-editor/react";
import { VscChromeClose, VscCircleFilled } from "react-icons/vsc";
import Modal from "react-modal";
import { getMaterialFileIcon } from "file-extension-icon-js";
import { DndProvider, useDrop } from "react-dnd";
import { HTML5Backend, NativeTypes } from "react-dnd-html5-backend";
import { VscCloudUpload } from "react-icons/vsc";

function CodeEditor({
  code,
  setCode,
  filename,
  save_file,
  canEdit,
}: {
  code: string;
  setCode: (code: string) => void;
  filename: string;
  save_file: () => void;
  canEdit: boolean;
}) {
  return (
    <Editor
      path={filename}
      theme="vs-dark"
      value={code}
      options={{
        automaticLayout: true,
        readOnly: !canEdit,
        domReadOnly: !canEdit,
      }}
      onChange={(code) => {
        if (!canEdit) return;
        setCode(code || "");
      }}
      className="h-full w-full"
      wrapperProps={{
        onKeyDown: (e: any) => {
          if (e.ctrlKey && e.key === "s") {
            e.preventDefault();
            save_file();
          }
        },
      }}
    />
  );
}

function EditorTab({
  file,
  open_file,
  on_file_open,
  modified_files,
  setConfirmation,
  setConfirmationFile,
}: {
  file: string;
  open_file?: string;
  on_file_open: (path?: string) => void;
  modified_files: { path: string; content: string }[];
  setConfirmation: (confirmation: boolean) => void;
  setConfirmationFile: (file: string) => void;
}) {
  const [hoverClose, setHoverClose] = useState<boolean>(false);

  return (
    <div
      className={`flex flex-row items-center px-4 gap-2 py-1 cursor-pointer ${
        open_file === file ? "bg-zinc-800" : ""
      }`}
      onClick={() => on_file_open(file)}
    >
      <img src={getMaterialFileIcon(file)} alt="" width="16" />
      <span className="text-sm">{file.split("/").slice(-1)[0]}</span>
      <span
        className="hover:bg-zinc-700 rounded p-0.5 text-sm"
        onMouseEnter={() => setHoverClose(true)}
        onMouseLeave={() => setHoverClose(false)}
        onClick={(e) => {
          // Check whether the file was modified
          if (modified_files.find((f) => f.path === file)) {
            setConfirmation(true);
            setConfirmationFile(file);
          } else {
            on_file_open();
          }
          e.stopPropagation();
        }}
      >
        {modified_files.find((f) => f.path === file) && !hoverClose ? (
          <VscCircleFilled />
        ) : (
          <VscChromeClose />
        )}
      </span>
    </div>
  );
}

type BufferEdit = { path: string; content: string };
type SetBuffers = Dispatch<SetStateAction<BufferEdit[]>>;

function EditorTabs({
  modified_files,
  setModifiedFiles,
  open_file,
  on_file_open,
  save_file,
  canEdit,
}: {
  modified_files: BufferEdit[];
  setModifiedFiles: SetBuffers;
  open_file: string | undefined;
  on_file_open: (path?: string) => void;
  save_file: (path: string, content: string) => void;
  canEdit: boolean;
}) {
  const modified_files_with_open_file =
    modified_files.find((file) => file.path === open_file) ||
    open_file === undefined
      ? modified_files.map((file) => file.path)
      : [...modified_files.map((file) => file.path), open_file || ""];
  const [confirmation, setConfirmation] = useState<boolean>(false);
  const [confirmation_file, setConfirmationFile] = useState<string>("");

  return (
    <div className="flex shrink-0 flex-row items-stretch bg-zinc-950">
      {modified_files_with_open_file.map((file) => (
        <EditorTab
          key={file}
          file={file}
          open_file={open_file}
          on_file_open={on_file_open}
          modified_files={modified_files}
          setConfirmation={setConfirmation}
          setConfirmationFile={setConfirmationFile}
        />
      ))}
      <div className="flex-grow"></div>
      <div className="flex flex-row gap-0 overflow-hidden">
        <button
          disabled={!canEdit}
          className={`text-white font-bold py-2 px-4 rounded ${
            canEdit && modified_files.find((f) => f.path === open_file)
              ? "bg-green-700 hover:bg-green-600"
              : "bg-zinc-700"
          }`}
          onClick={() => {
            if (!canEdit || open_file === undefined) return;
            const current_file = modified_files.find(
              (f) => f.path === open_file
            );
            if (!current_file) return;
            save_file(open_file, current_file.content);
            setModifiedFiles(
              modified_files.filter((f) => f.path !== open_file)
            );
          }}
        >
          Save
        </button>
      </div>
      <Modal
        isOpen={confirmation}
        contentLabel="Confirm close"
        style={{
          content: {
            top: "50%",
            left: "50%",
            right: "auto",
            bottom: "auto",
            marginRight: "-50%",
            transform: "translate(-50%, -50%)",
            backgroundColor: "#1e1e1e",
          },
          overlay: {
            backgroundColor: "rgba(0, 0, 0, 0.75)",
          },
        }}
        onRequestClose={() => setConfirmation(false)}
      >
        <div className="flex flex-col gap-4 items-stretch">
          <span className="text-xl font-bold text-center">
            Do you want to save the changes you made to {confirmation_file}?
          </span>
          <span className="text-center">
            Your changes will be lost if you don&apos;t save them.
          </span>
          <div className="flex flex-row justify-stretch rounded overflow-hidden">
            <button
              className="bg-zinc-700 hover:bg-zinc-600 text-white font-bold py-2 px-4 flex-1 border-zinc-700 border-2"
              onClick={() => {
                if (open_file === confirmation_file) on_file_open();
                setModifiedFiles(
                  modified_files.filter((f) => f.path !== confirmation_file)
                );
                setConfirmation(false);
              }}
            >
              Don&apos;t Save
            </button>
            <button
              className="bg-zinc-700 hover:bg-zinc-600 text-white font-bold py-2 px-4 flex-1 border-zinc-700 border-2"
              onClick={() => setConfirmation(false)}
            >
              Cancel
            </button>
            <button
              className="bg-zinc-700 hover:bg-zinc-600 text-white font-bold py-2 px-4 flex-1 border-zinc-600 border-2"
              onClick={() => {
                save_file(
                  confirmation_file,
                  modified_files.find((f) => f.path === confirmation_file)
                    ?.content || ""
                );
                setModifiedFiles(
                  modified_files.filter((f) => f.path !== confirmation_file)
                );
                if (open_file === confirmation_file) on_file_open();
                setConfirmation(false);
              }}
            >
              Save
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function UploadPlaceholder({
  save_file,
  canEdit,
  idleMessage,
}: {
  save_file: (path: string, content: string) => void;
  canEdit: boolean;
  idleMessage?: string;
}) {
  const [, native_drop] = useDrop(
    () => ({
      accept: [NativeTypes.FILE],
      drop(item: any) {
        if (!canEdit) return;
        for (const file of item.files) {
          file.text().then((text: string) => {
            save_file(file.name, text);
          });
        }
      },
    }),
    [save_file, canEdit]
  );

  return (
    <div
      className="flex flex-col gap-2 items-center justify-center flex-grow bg-zinc-950"
      ref={native_drop}
    >
      <span className="text-2xl font-bold text-zinc-50">No file selected</span>
      {canEdit ? <VscCloudUpload className="text-6xl text-zinc-50" /> : null}
      <span className="text-xl text-zinc-50">
        {canEdit
          ? "Drag and drop a file to upload, or"
          : idleMessage ?? "Editing is closed."}
      </span>
      {canEdit ? (
      <button
        className="bg-zinc-700 hover:bg-zinc-600 text-white font-bold py-2 px-4 rounded"
        onClick={() => {
          const input = document.createElement("input");
          input.type = "file";
          input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;
            file.text().then((text: string) => {
              save_file(file.name, text);
            });
          };
          input.click();
        }}
      >
        Select a file
      </button>
      ) : null}
    </div>
  );
}

export default function FileEditor({
  files: files,
  active_file,
  setActiveFile,
  save_file,
  modified_files,
  setModifiedFiles,
  canEdit,
  idleMessage,
}: {
  files: { path: string; content: string; saved_content: string | null }[];
  active_file?: string;
  setActiveFile: (path?: string) => void;
  save_file: (path: string, content: string) => void;
  modified_files: BufferEdit[];
  setModifiedFiles: SetBuffers;
  canEdit: boolean;
  idleMessage?: string;
}) {
  const filesRef = useRef(files);
  filesRef.current = files;
  const modifiedRef = useRef(modified_files);
  modifiedRef.current = modified_files;
  const [open_file, setOpenFile] = useState<string | undefined>(active_file);
  const [open_file_content, setOpenFileContent] = useState<string | undefined>(
    files.find((file) => file.path === active_file)?.content
  );

  useEffect(() => {
    setOpenFile(active_file);
    if (active_file === undefined) {
      setOpenFileContent(undefined);
      return;
    }
    const local = modifiedRef.current.find((file) => file.path === active_file);
    if (local) {
      setOpenFileContent(local.content);
      return;
    }
    setOpenFileContent(
      filesRef.current.find((file) => file.path === active_file)?.content ?? ""
    );
  }, [active_file]);

  const savedNow =
    open_file !== undefined
      ? files.find((file) => file.path === open_file)?.saved_content
      : undefined;
  useEffect(() => {
    if (!canEdit || open_file === undefined || open_file_content === undefined) {
      return;
    }
    const original = filesRef.current.find((file) => file.path === open_file);
    if (!original && open_file !== "") return;
    const saved = original?.saved_content ?? "";
    setModifiedFiles((current) => {
      if (open_file_content !== saved) {
        const existing = current.find((file) => file.path === open_file);
        if (existing?.content === open_file_content) return current;
        const next = { path: open_file, content: open_file_content };
        return existing
          ? current.map((file) => (file.path === open_file ? next : file))
          : [...current, next];
      }
      if (!current.some((file) => file.path === open_file)) return current;
      return current.filter((file) => file.path !== open_file);
    });
  }, [canEdit, open_file, open_file_content, savedNow, setModifiedFiles]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <EditorTabs
        modified_files={modified_files}
        setModifiedFiles={setModifiedFiles}
        open_file={open_file}
        on_file_open={(path) => setActiveFile(path)}
        save_file={(path, content) => save_file(path, content)}
        canEdit={canEdit}
      />
      {open_file !== undefined ? (
        <div className="min-h-0 flex-1 overflow-hidden">
          <CodeEditor
            code={open_file_content || ""}
            setCode={(value) => {
              if (!canEdit) return;
              setOpenFileContent(value);
            }}
            filename={open_file || ""}
            canEdit={canEdit}
            save_file={() => {
              if (!canEdit || open_file === undefined) return;
              save_file(
                open_file,
                modified_files.find((f) => f.path === open_file)?.content || ""
              );
              setModifiedFiles(
                modified_files.filter((f) => f.path !== open_file)
              );
            }}
          />
        </div>
      ) : (
        <DndProvider backend={HTML5Backend}>
          <UploadPlaceholder
            save_file={save_file}
            canEdit={canEdit}
            idleMessage={idleMessage}
          />
        </DndProvider>
      )}
    </div>
  );
}
