import jedi
from docstring_to_markdown import convert

def get_completions(source, line, column):
    try:
        script = jedi.Script(source, path="main.py")
        completions = script.complete(line, column)
        
        results = []
        for c in completions:
            results.append({
                "label": c.name,
                "kind": c.type,
                "detail": c.description,
                "insertText": c.name
            })
        return results
    except Exception as e:
        return []

def get_hover(source, line, column):
    try:
        script = jedi.Script(source, path="main.py")
        
        # Try to get signatures first for functions/methods (includes full type hints)
        signatures = script.get_signatures(line, column)
        
        # Get help/infer for docstrings and general info
        contexts = script.help(line, column)
        if not contexts:
            contexts = script.infer(line, column)
        
        if not contexts and not signatures:
            return None

        signature = ""
        docstring = ""
        symbol_type = ""
        
        if signatures:
            # Use signature info for functions (has full type hints)
            sig = signatures[0]
            # Build full signature: func_name(param1: type1, param2: type2) -> return_type
            params = []
            for p in sig.params:
                param_str = p.name
                if p.description and p.description != p.name:
                    # description often contains "param: type" or "param=default"
                    param_str = p.description
                params.append(param_str)
            
            signature = f"def {sig.name}({', '.join(params)})"
            symbol_type = "function"
            
        if contexts:
            c = contexts[0]
            symbol_type = c.type or symbol_type
            
            # If we don't have a signature yet, use description
            if not signature:
                signature = c.description or ""
            
            # Get the docstring
            raw_docstring = c.docstring() or ""
            
            # The docstring often starts with the signature line, we need to remove it
            # to avoid duplication. Look for the first line that looks like a signature.
            lines = raw_docstring.split('\n')
            doc_start_idx = 0
            
            if lines:
                first_line = lines[0].strip()
                # Check if first line looks like a signature (contains the function name and parentheses)
                # Common patterns: "func(arg1, arg2)" or "func(arg1: int, arg2: str) -> int"
                if '(' in first_line and ')' in first_line:
                    # This looks like a signature line, check if it matches our symbol
                    if signature:
                        # Extract just the name part to compare
                        sig_name = signature.split('(')[0].replace('def ', '').replace('class ', '').strip()
                        if sig_name and sig_name in first_line:
                            doc_start_idx = 1
                            # Also skip empty lines after signature
                            while doc_start_idx < len(lines) and not lines[doc_start_idx].strip():
                                doc_start_idx += 1
                            # Use the signature from docstring as it may have more type info
                            if '->' in first_line or ':' in first_line:
                                # Docstring signature has type hints, prefer it
                                if first_line.startswith('def ') or first_line.startswith('class '):
                                    signature = first_line
                                else:
                                    signature = f"def {first_line}" if symbol_type == "function" else first_line
            
            docstring = '\n'.join(lines[doc_start_idx:]).strip()
        
        # Convert docstring to Markdown using docstring-to-markdown library
        try:
            markdown_docstring = convert(docstring) if docstring else ""
        except Exception:
            # If conversion fails, use raw docstring
            markdown_docstring = docstring
        
        return {
            "code": signature,
            "docstring": markdown_docstring,
            "type": symbol_type
        }
    except Exception as e:
        return None

__all__ = ["get_completions", "get_hover"]