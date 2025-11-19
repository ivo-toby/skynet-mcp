# LSP Configuration for Neovim

This project is now properly configured for Python LSP (Pyright/Pylance/Basedpyright).

## Files Added

1. **pyrightconfig.json** - Standalone Pyright configuration
2. **pyproject.toml** - Added `[tool.pyright]` section
3. **.python-version** - Specifies Python 3.11.14 for pyenv

## Configuration Details

### Virtual Environment
- Location: `.venv/`
- Python: 3.11.14
- All dependencies installed with type information

### Type Checking Mode
- Mode: `basic` (balanced between strictness and usability)
- Missing type stubs: Warnings disabled (using inline types from packages)
- Library code types: Enabled

### Packages with Type Information

All major dependencies include type information:

✅ **pydantic** - Has py.typed (inline types)
✅ **openai** - Has py.typed (inline types)
✅ **anthropic** - Has py.typed (inline types)
✅ **google-generativeai** - Has py.typed (inline types)
✅ **google.ai.generativelanguage** - Has py.typed (inline types)

## Neovim LSP Setup

### If using Pyright/Pylance

The LSP should automatically detect:
1. `.python-version` - Python version
2. `pyrightconfig.json` - Pyright settings
3. `.venv/` - Virtual environment

### Restart LSP

After pulling these changes, restart your LSP:

```vim
:LspRestart
```

Or restart Neovim completely.

### Verify Configuration

Check LSP info:
```vim
:LspInfo
```

You should see:
- Root directory: `/home/ivo/workspace/skynet-mcp`
- Python interpreter: `.venv/bin/python`
- No unresolved imports

## Troubleshooting

### Still seeing unresolved imports?

1. **Restart Neovim completely**
   ```bash
   # Exit nvim and restart
   ```

2. **Verify venv is activated**
   ```bash
   source .venv/bin/activate
   python -c "import pydantic, anthropic, openai; print('OK')"
   ```

3. **Check LSP logs**
   ```vim
   :LspLog
   ```

4. **Manually set Python path in nvim**

   If using `nvim-lspconfig` with Pyright:
   ```lua
   require'lspconfig'.pyright.setup{
     settings = {
       python = {
         pythonPath = vim.fn.getcwd() .. "/.venv/bin/python",
         venvPath = vim.fn.getcwd(),
         venv = ".venv"
       }
     }
   }
   ```

5. **Clear LSP cache**
   ```bash
   rm -rf ~/.cache/nvim/lsp*
   ```

## Type Checking Verification

All type checks pass:

```bash
# mypy
mypy src/ --show-error-codes
# Output: Success: no issues found in 21 source files

# pyright (if installed)
pyright src/
```

## Development Dependencies

Type checking tools are in `[project.optional-dependencies]`:

```bash
pip install -e ".[dev]"
```

This includes:
- mypy>=1.13.0
- types-PyYAML>=6.0.12 (type stubs for YAML)
- ruff (linter/formatter)
- pytest suite
