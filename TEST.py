import os

def print_tree(startpath, prefix="", exclude_dirs=None):
    if exclude_dirs is None:
        exclude_dirs = []

    entries = os.listdir(startpath)
    entries.sort()
    
    for idx, name in enumerate(entries):
        path = os.path.join(startpath, name)
        connector = "└── " if idx == len(entries) - 1 else "├── "

        if os.path.isdir(path):
            if name in exclude_dirs:
                continue
            print(prefix + connector + name + "/")
            new_prefix = prefix + ("    " if idx == len(entries) - 1 else "│   ")
            print_tree(path, new_prefix, exclude_dirs)
        else:
            print(prefix + connector + name)

# === Usage ===
base_folder = "C:/Users/Lenovo Thinkpad T480/Desktop/Internship"

excluded_folders = ["venv"]

print_tree(base_folder, exclude_dirs=excluded_folders)
