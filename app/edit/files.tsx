"use client";
import path from "path";
import { useEffect, useRef, useState } from "react";
import { getMaterialFileIcon } from "file-extension-icon-js";
import {
  VscChevronDown,
  VscChevronRight,
  VscNewFolder,
  VscNewFile,
  VscTrash,
  VscCloudUpload,
} from "react-icons/vsc";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend, NativeTypes } from "react-dnd-html5-backend";

interface ItemType {
  type: string;
  move: (path: string | null) => void;
}

function File({
  name,
  active,
  on_file_open,
  icon,
  save_file,
  rename_file,
  delete_file,
  depth = 0,
  accept_into_self = false,
  canEdit,
}: {
  name: string;
  active: boolean;
  on_file_open: (path: string) => void;
  icon?: React.ReactNode;
  save_file: (path: string, content: string) => void;
  rename_file: (path: string) => void;
  delete_file: () => void;
  depth?: number;
  accept_into_self?: boolean;
  canEdit: boolean;
}) {
  const [renaming, setRenaming] = useState(
    name.split("/").slice(-1)[0].length === 0
  );
  const [newName, setNewName] = useState(name.split("/").slice(-1)[0]);
  const renameDone = useRef(false);
  useEffect(() => {
    if (renaming) renameDone.current = false;
  }, [renaming]);
  useEffect(() => {
    setNewName(name.split("/").slice(-1)[0]);
    if (!renaming && name.split("/").slice(-1)[0].length === 0) {
      delete_file();
    }
  }, [name, renaming]);
  const [, drag] = useDrag(
    () => ({
      type: "file",
      canDrag: canEdit,
      item: {
        move: (new_folder: string) => {
          rename_file(
            new_folder
              ? path.join(new_folder, name.split("/").slice(-1)[0])
              : name.split("/").slice(-1)[0]
          );
        },
      },
    }),
    [name, canEdit]
  );
  const [, drop] = useDrop(
    () => ({
      accept: "file",
      drop: (item: ItemType) => {
        item.move(
          accept_into_self ? name : name.split("/").slice(0, -1).join("/")
        );
      },
    }),
    [name]
  );
  const [, native_drop] = useDrop(
    () => ({
      accept: [NativeTypes.FILE],
      drop(item: any) {
        if (!canEdit) return;
        for (const file of item.files) {
          const parent = accept_into_self
            ? name
            : name.split("/").slice(0, -1).join("/");
          const destination = parent ? path.join(parent, file.name) : file.name;
          file.text().then((text: string) => {
            save_file(destination, text);
          });
        }
      },
    }),
    [name, save_file, canEdit]
  );

  // Enter and clicking away both finish the rename.
  const finishRename = () => {
    if (renameDone.current) return;
    renameDone.current = true;
    setRenaming(false);
    if (newName.length === 0) {
      delete_file();
      return;
    }
    const current = name.split("/").slice(-1)[0];
    if (newName === current) return;
    const parent_location = name.split("/").slice(0, -1).join("/");
    rename_file(
      parent_location ? path.join(parent_location, newName) : newName
    );
  };

  return (
    <div
      ref={(node) => drag(drop(native_drop(node)))}
      className={`flex flex-row items-center gap-2 px-2 py-1 cursor-pointer ${
        active ? "bg-zinc-700" : ""
      }`}
      style={{ paddingLeft: `${depth * 1.5 + 0.5}rem` }}
      onClick={() => on_file_open(name)}
      onDoubleClick={() => {
        if (canEdit) setRenaming(true);
      }}
    >
      {icon || <img src={getMaterialFileIcon(name)} alt="" width="16" />}
      {renaming ? (
        <input
          type="text"
          value={newName}
          className="bg-zinc-700 text-white"
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              finishRename();
            } else if (e.key === "Escape") {
              renameDone.current = true;
              setRenaming(false);
              setNewName(name.split("/").slice(-1)[0]);
              if (name.split("/").slice(-1)[0].length === 0) delete_file();
            }
          }}
          onBlur={finishRename}
          autoFocus
        />
      ) : (
        <>
          <span>{name.split("/").slice(-1)[0]}</span>
          {canEdit ? <DeleteFileButton delete_file={delete_file} /> : null}
        </>
      )}
    </div>
  );
}

function DeleteFileButton({ delete_file }: { delete_file: () => void }) {
  return (
    <div className="flex flex-row justify-end flex-1 cursor-pointer text-zinc-600 opacity-0 hover:opacity-100 transition-opacity">
      <span
        className="rounded-md p-1 hover:bg-zinc-950"
        onClick={(e) => {
          e.stopPropagation();
          delete_file();
        }}
      >
        <VscTrash />
      </span>
    </div>
  );
}

function TreeContent({
  files,
  location,
  active_file,
  on_file_open,
  save_file,
  rename_file,
  rename_folder,
  delete_file,
  depth = 0,
  canEdit,
}: {
  files: { path: string; content: string | null }[];
  location: string;
  active_file?: string;
  on_file_open: (path: string) => void;
  save_file: (path: string, content: string) => void;
  rename_file: (path: string, new_path: string) => void;
  rename_folder: (path: string, new_path: string) => void;
  delete_file: (path: string) => void;
  depth?: number;
  canEdit: boolean;
}) {
  const files_in_location = files.filter((file) =>
    file.path.startsWith(location.length ? location + "/" : "")
  );
  const relative_files = files_in_location.map((file) => ({
    path: file.path.slice(location.length ? location.length + 1 : 0),
    content: file.content,
  }));
  const folders = relative_files
    .filter((file) => file.path.includes("/") || file.content === null)
    .map((file) => file.path.split("/")[0])
    .sort((a, b) => a.localeCompare(b))
    .filter((value, index, self) => self.indexOf(value) === index);
  const files_in_root = files
    .filter(
      (file) =>
        !file.path.slice(location.length + 1).includes("/") &&
        file.content !== null
    )
    .sort((a, b) => a.path.localeCompare(b.path));

  return (
    <div className="flex flex-col items-stretch gap-0">
      {folders.map((folder) => (
        <Subtree
          key={folder}
          name={folder}
          location={location}
          files={files.filter((file) => file.path.startsWith(`${folder}/`))}
          active_file={active_file}
          on_file_open={on_file_open}
          save_file={save_file}
          rename_file={rename_file}
          rename_folder={rename_folder}
          delete_file={delete_file}
          depth={depth}
          canEdit={canEdit}
        />
      ))}
      {files_in_root.map((file) => (
        <File
          key={file.path}
          name={file.path}
          active={file.path === active_file}
          on_file_open={on_file_open}
          depth={depth}
          save_file={save_file}
          canEdit={canEdit}
          rename_file={(new_path: string) => {
            if (
              files.filter(
                (f) => f.path === new_path || f.path.startsWith(new_path + "/")
              ).length > 0
            ) {
              return;
            }
            rename_file(file.path, new_path);
            if (file.path === active_file) {
              on_file_open(new_path);
            }
          }}
          delete_file={() => delete_file(file.path)}
        />
      ))}
    </div>
  );
}

function Subtree({
  name,
  location,
  files,
  active_file,
  on_file_open,
  save_file,
  rename_file,
  rename_folder,
  delete_file,
  depth = 0,
  canEdit,
}: {
  name: string;
  location: string;
  files: { path: string; content: string | null }[];
  active_file?: string;
  on_file_open: (path: string) => void;
  save_file: (path: string, content: string) => void;
  rename_file: (path: string, new_path: string) => void;
  rename_folder: (path: string, new_path: string) => void;
  delete_file: (path: string) => void;
  depth?: number;
  canEdit: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <File
        key={name}
        name={name}
        active={
          active_file?.startsWith(path.join(location, name) + "/") || false
        }
        on_file_open={() => setOpen(!open)}
        icon={open ? <VscChevronDown /> : <VscChevronRight />}
        save_file={save_file}
        rename_file={(new_path: string) =>
          rename_folder(location ? path.join(location, name) : name, new_path)
        }
        delete_file={() =>
          delete_file(location ? path.join(location, name) : name)
        }
        depth={depth}
        accept_into_self={true}
        canEdit={canEdit}
      />
      {open && (
        <TreeContent
          files={files}
          location={path.join(location, name)}
          active_file={active_file}
          on_file_open={on_file_open}
          save_file={save_file}
          rename_file={rename_file}
          rename_folder={rename_folder}
          delete_file={delete_file}
          depth={depth + 1}
          canEdit={canEdit}
        />
      )}
    </>
  );
}

function FileBrowserContent({
  files,
  active_file,
  on_file_open,
  save_file,
  rename_file,
  rename_folder,
  delete_file,
  canEdit,
}: {
  files: { path: string; content: string | null }[];
  active_file?: string;
  on_file_open: (path: string) => void;
  save_file: (path: string, content: string) => void;
  rename_file: (path: string, new_path: string) => void;
  rename_folder: (path: string, new_path: string) => void;
  delete_file: (path: string) => void;
  canEdit: boolean;
}) {
  const [, drop] = useDrop(() => ({
    accept: "file",
    drop: (item: ItemType) => {
      if (!canEdit) return;
      item.move(null);
    },
  }), [canEdit]);
  const [, native_drop] = useDrop(() => ({
    accept: [NativeTypes.FILE],
    drop(item: any) {
      if (!canEdit) return;
      for (const file of item.files) {
        file.text().then((text: string) => {
          save_file(file.name, text);
        });
      }
    },
  }), [canEdit, save_file]);

  return (
    <>
      <TreeContent
        files={files}
        location=""
        active_file={active_file}
        on_file_open={on_file_open}
        save_file={save_file}
        rename_file={rename_file}
        rename_folder={rename_folder}
        delete_file={delete_file}
        canEdit={canEdit}
      />
      {canEdit ? (
        <div
          className="flex flex-col justify-center items-center flex-1 max-md:hidden"
          ref={(node) => drop(native_drop(node))}
        >
          <VscCloudUpload className="text-6xl text-zinc-700" />
          <span className="text-zinc-700">Drop files here to upload</span>
        </div>
      ) : (
        <div className="flex-1" />
      )}
    </>
  );
}

export default function FileBrowser({
  files,
  active_file,
  on_file_open,
  save_file,
  delete_file,
  canEdit,
}: {
  files: { path: string; content: string }[];
  active_file?: string;
  on_file_open: (path?: string) => void;
  save_file: (path: string, content: string) => boolean | Promise<boolean>;
  delete_file: (path: string) => void;
  canEdit: boolean;
}) {
  const [created_folders, setCreatedFolders] = useState<string[]>([]);
  const [created_files, setCreatedFiles] = useState<string[]>([]);
  const rename_file = (original: string, newName: string) => {
    const pending = created_files.includes(original);
    const file =
      files.find((file) => file.path === original) ??
      (pending ? { path: original, content: "" } : undefined);
    const target_exists =
      files.find(
        (file) =>
          file.path === newName ||
          file.path.startsWith(newName + "/") ||
          newName.startsWith(file.path + "/")
      ) ||
      created_folders.includes(newName) ||
      created_files.includes(newName);
    if (!file || target_exists) return;
    if (pending) {
      setCreatedFiles(
        created_files.map((path) => (path === original ? newName : path))
      );
    }
    void Promise.resolve(save_file(newName, file.content)).then((saved) => {
      if (!saved) return;
      if (pending) {
        setCreatedFiles((paths) => paths.filter((path) => path !== newName));
        return;
      }
      delete_file(original);
    });
  };
  const rename_folder = (original: string, newName: string) => {
    if (created_folders.includes(original)) {
      if (
        files.find((file) => file.path === newName) ||
        created_folders.includes(newName)
      )
        return;
      setCreatedFolders(
        created_folders.map((folder) =>
          folder === original ? newName : folder
        )
      );
    }
    const files_in_folder = files.filter((file) =>
      file.path.startsWith(original + "/")
    );
    files_in_folder.forEach((file) => {
      rename_file(
        file.path,
        newName + file.path.slice(original.length, file.path.length)
      );
    });
  };
  const delete_file_full = (path: string) => {
    if (created_folders.includes(path)) {
      setCreatedFolders(created_folders.filter((folder) => folder !== path));
    }
    if (created_files.includes(path)) {
      setCreatedFiles(created_files.filter((file) => file !== path));
      // An abandoned new file has nothing on the server; close its tab.
      if (active_file === path) on_file_open(undefined);
    }
    const files_in_folder = files.filter((file) =>
      file.path.startsWith(path + "/")
    );
    files_in_folder.forEach((file) => {
      delete_file_full(file.path);
    });
    // Also for a never-created file, so any unsaved buffer under its path goes.
    if (files.find((file) => file.path === path) || created_files.includes(path)) {
      delete_file(path);
    }
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex flex-row items-center gap-2 p-2 cursor-pointer bg-zinc-700">
        <span>Files</span>
        <div className="flex-grow" />
        {canEdit ? (
          <>
            <VscNewFile
              onClick={() => {
                setCreatedFiles([...created_files, ""]);
                on_file_open("");
              }}
            />
            <VscNewFolder
              onClick={() => setCreatedFolders([...created_folders, ""])}
            />
          </>
        ) : null}
      </div>
      <FileBrowserContent
        files={(files as { path: string; content: string | null }[]).concat(
          created_folders.map((folder) => ({
            path: folder,
            content: null,
          })),
          created_files.map((file) => ({
            path: file,
            content: "",
          }))
        )}
        active_file={active_file}
        on_file_open={on_file_open}
        save_file={save_file}
        rename_file={rename_file}
        rename_folder={rename_folder}
        delete_file={delete_file_full}
        canEdit={canEdit}
      />
    </DndProvider>
  );
}
