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
  VscCircleFilled,
  VscCloudUpload,
} from "react-icons/vsc";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend, NativeTypes } from "react-dnd-html5-backend";
import { toast } from "sonner";
import { pathError } from "../../lib/paths";

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
  on_save,
  edited = false,
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
  on_save?: () => void;
  edited?: boolean;
  depth?: number;
  accept_into_self?: boolean;
  canEdit: boolean;
}) {
  const baseName = name.split("/").slice(-1)[0];
  const parent_location = name.split("/").slice(0, -1).join("/");
  const [renaming, setRenaming] = useState(baseName.length === 0);
  const [newName, setNewName] = useState(baseName);
  const [renameError, setRenameError] = useState<string | null>(null);
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const renameDone = useRef(false);
  useEffect(() => {
    if (renaming) renameDone.current = false;
  }, [renaming]);
  useEffect(() => {
    setNewName(baseName);
    if (!renaming && baseName.length === 0) {
      delete_file();
    }
  }, [name, renaming]);
  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("click", close);
    window.addEventListener("contextmenu", close);
    window.addEventListener("blur", close);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("contextmenu", close);
      window.removeEventListener("blur", close);
      window.removeEventListener("keydown", onKey);
    };
  }, [menu]);
  const [, drag] = useDrag(
    () => ({
      type: "file",
      canDrag: canEdit && !renaming,
      item: {
        move: (new_folder: string) => {
          rename_file(
            new_folder ? path.join(new_folder, baseName) : baseName
          );
        },
      },
    }),
    [name, canEdit, renaming]
  );
  const [, drop] = useDrop(
    () => ({
      accept: "file",
      drop: (item: ItemType) => {
        item.move(accept_into_self ? name : parent_location);
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
          const parent = accept_into_self ? name : parent_location;
          const destination = parent ? path.join(parent, file.name) : file.name;
          file.text().then((text: string) => {
            save_file(destination, text);
          });
        }
      },
    }),
    [name, save_file, canEdit]
  );

  const cancelRename = () => {
    renameDone.current = true;
    setRenaming(false);
    setRenameError(null);
    setNewName(baseName);
    if (baseName.length === 0) delete_file();
  };

  // Enter and clicking away both finish the rename. A bad name keeps the
  // input open on Enter, so the reason can be read and the name fixed.
  const finishRename = (viaBlur: boolean) => {
    if (renameDone.current) return;
    if (newName.length === 0) {
      renameDone.current = true;
      setRenaming(false);
      delete_file();
      return;
    }
    if (newName === baseName) {
      cancelRename();
      return;
    }
    const target = parent_location ? path.join(parent_location, newName) : newName;
    const invalid = pathError(target);
    if (invalid) {
      if (viaBlur) {
        toast.error(invalid);
        cancelRename();
      } else {
        setRenameError(invalid);
      }
      return;
    }
    renameDone.current = true;
    setRenaming(false);
    setRenameError(null);
    rename_file(target);
  };

  const startRename = () => {
    if (!canEdit) return;
    setMenu(null);
    setRenaming(true);
  };

  return (
    <div
      ref={(node) => drag(drop(native_drop(node)))}
      className={`flex flex-row items-center gap-2 px-2 py-1 cursor-pointer ${
        active ? "bg-zinc-700" : ""
      }`}
      style={{ paddingLeft: `${depth * 1.5 + 0.5}rem` }}
      onClick={() => {
        if (!renaming) on_file_open(name);
      }}
      onDoubleClick={startRename}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setMenu({ x: e.clientX, y: e.clientY });
      }}
    >
      {icon || <img src={getMaterialFileIcon(name)} alt="" width="16" />}
      {renaming ? (
        <div className="flex min-w-0 flex-1 flex-col">
          <input
            type="text"
            value={newName}
            className={`bg-zinc-700 text-white ${
              renameError ? "outline outline-1 outline-red-500" : ""
            }`}
            onChange={(e) => {
              setNewName(e.target.value);
              setRenameError(null);
            }}
            onClick={(e) => e.stopPropagation()}
            onDoubleClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                finishRename(false);
              } else if (e.key === "Escape") {
                cancelRename();
              }
            }}
            onBlur={() => finishRename(true)}
            autoFocus
            onFocus={(e) => {
              const dot = e.target.value.lastIndexOf(".");
              e.target.setSelectionRange(0, dot > 0 ? dot : e.target.value.length);
            }}
          />
          {renameError ? (
            <span className="text-xs text-red-400">{renameError}</span>
          ) : null}
        </div>
      ) : (
        <>
          <span className="truncate">{baseName}</span>
          {edited ? (
            <VscCircleFilled
              className="shrink-0 text-xs text-amber-300"
              title="Unsaved changes"
              aria-label="Unsaved changes"
            />
          ) : null}
          {canEdit ? <DeleteFileButton delete_file={delete_file} /> : null}
        </>
      )}
      {menu ? (
        <div
          role="menu"
          className="fixed z-50 min-w-36 rounded border border-zinc-600 bg-zinc-900 py-1 text-sm shadow-lg shadow-black"
          style={{ left: menu.x, top: menu.y }}
          onClick={(e) => e.stopPropagation()}
          onContextMenu={(e) => e.preventDefault()}
        >
          <MenuItem
            label="Save"
            disabled={!canEdit || !on_save}
            onSelect={() => {
              setMenu(null);
              on_save?.();
            }}
          />
          <MenuItem label="Rename" disabled={!canEdit} onSelect={startRename} />
          <MenuItem
            label="Delete"
            disabled={!canEdit}
            danger
            onSelect={() => {
              setMenu(null);
              delete_file();
            }}
          />
        </div>
      ) : null}
    </div>
  );
}

function MenuItem({
  label,
  disabled,
  danger,
  onSelect,
}: {
  label: string;
  disabled?: boolean;
  danger?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      className={`block w-full px-3 py-1 text-left ${
        disabled
          ? "text-zinc-600 cursor-default"
          : `hover:bg-zinc-700 ${danger ? "text-red-400" : ""}`
      }`}
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled) onSelect();
      }}
    >
      {label}
    </button>
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
  edited,
  save_path,
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
  edited: ReadonlySet<string>;
  save_path: (path: string) => void;
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
          edited={edited}
          save_path={save_path}
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
          edited={edited.has(file.path)}
          on_save={edited.has(file.path) ? () => save_path(file.path) : undefined}
          rename_file={(new_path: string) => rename_file(file.path, new_path)}
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
  edited,
  save_path,
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
  edited: ReadonlySet<string>;
  save_path: (path: string) => void;
  depth?: number;
  canEdit: boolean;
}) {
  const [open, setOpen] = useState(false);
  const full = location ? path.join(location, name) : name;
  const folderEdited = Array.from(edited).some((p) => p.startsWith(full + "/"));
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
        edited={folderEdited}
        on_save={folderEdited ? () => save_path(full) : undefined}
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
          edited={edited}
          save_path={save_path}
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
  edited,
  save_path,
  canEdit,
}: {
  files: { path: string; content: string | null }[];
  active_file?: string;
  on_file_open: (path: string) => void;
  save_file: (path: string, content: string) => void;
  rename_file: (path: string, new_path: string) => void;
  rename_folder: (path: string, new_path: string) => void;
  delete_file: (path: string) => void;
  edited: ReadonlySet<string>;
  save_path: (path: string) => void;
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
        edited={edited}
        save_path={save_path}
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
  rename_file: move_file,
  delete_file,
  modified_files = [],
  canEdit,
}: {
  files: { path: string; content: string; saved_content?: string | null }[];
  active_file?: string;
  on_file_open: (path?: string) => void;
  save_file: (path: string, content: string) => boolean | Promise<boolean>;
  /** Moves a file, keeping its content and unsaved edits. */
  rename_file?: (path: string, new_path: string) => boolean | Promise<boolean>;
  delete_file: (path: string) => void;
  /** Editor buffers with changes that are newer than `files`. */
  modified_files?: { path: string; content: string }[];
  canEdit: boolean;
}) {
  const [created_folders, setCreatedFolders] = useState<string[]>([]);
  const [created_files, setCreatedFiles] = useState<string[]>([]);

  // Files with changes that are not saved yet, either in the editor or as a
  // draft on the server.
  const content_of = new Map<string, string>();
  const edited = new Set<string>();
  for (const file of files) {
    content_of.set(file.path, file.content);
    if (file.saved_content !== undefined && file.content !== file.saved_content) {
      edited.add(file.path);
    }
  }
  for (const file of modified_files) {
    if (file.path === "") continue;
    content_of.set(file.path, file.content);
    edited.add(file.path);
  }
  const save_path = (target: string) => {
    for (const file_path of Array.from(edited)) {
      if (file_path === target || file_path.startsWith(target + "/")) {
        void save_file(file_path, content_of.get(file_path) ?? "");
      }
    }
  };

  const rename_file = (original: string, newName: string) => {
    const pending = created_files.includes(original);
    const exists = files.some((file) => file.path === original);
    const target_exists =
      files.find(
        (file) =>
          file.path === newName ||
          file.path.startsWith(newName + "/") ||
          newName.startsWith(file.path + "/")
      ) ||
      created_folders.includes(newName) ||
      created_files.includes(newName);
    if (target_exists) {
      toast.error("A file with that name already exists.");
      return;
    }
    if (!exists && !pending) return;
    if (!move_file) {
      // No rename support: fall back to writing the new name by hand.
      const text = content_of.get(original) ?? "";
      void Promise.resolve(save_file(newName, text)).then((saved) => {
        if (!saved) return;
        if (pending) {
          setCreatedFiles((paths) => paths.filter((p) => p !== newName));
        } else {
          delete_file(original);
        }
      });
      return;
    }
    if (pending) {
      setCreatedFiles((paths) => paths.map((p) => (p === original ? newName : p)));
    }
    void Promise.resolve(move_file(original, newName)).then((moved) => {
      if (moved && pending) {
        setCreatedFiles((paths) => paths.filter((p) => p !== newName));
      }
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
    // One at a time: each move is checked against the files as they are then.
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
        edited={edited}
        save_path={save_path}
        canEdit={canEdit}
      />
    </DndProvider>
  );
}
