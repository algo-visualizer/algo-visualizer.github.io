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
        
        # Combine items, preferring signatures if available
        items = signatures if signatures else contexts
        
        if not items:
            return None

        results = []
        for item in items:
            # Use Jedi's description as the signature/code part
            signature = item.description
            
            # Get the docstring and convert to Markdown
            raw_docstring = item.docstring(raw=True) or ""
            try:
                markdown_docstring = convert(raw_docstring) if raw_docstring else ""
            except Exception:
                markdown_docstring = raw_docstring
            
            results.append({
                "code": signature,
                "docstring": markdown_docstring,
                "type": getattr(item, "type", "")
            })
            
        return results
    except Exception as e:
        return None

def get_signature_help(source, line, column):
    try:
        script = jedi.Script(source, path="main.py")
        signatures = script.get_signatures(line, column)
        
        if not signatures:
            return None
            
        sig_results = []
        # Heuristic to find the best signature match:
        # 1. Prefer signatures where the current parameter index is within bounds of its parameters.
        # 2. Otherwise, use the first signature that has a valid index.
        main_active_signature = 0
        main_active_parameter = 0
        found_active = False
        for i, sig in enumerate(signatures):
            if sig.index is not None:
                if not found_active:
                    main_active_signature = i
                    main_active_parameter = sig.index
                    found_active = True
                
                # If the index is within bounds, this is likely the correct active signature
                if sig.index < len(sig.params):
                    main_active_signature = i
                    main_active_parameter = sig.index
                    break
        
        for sig in signatures:
            params = []
            for param in sig.params:
                param_docstring = param.docstring(raw=True) or ""
                try:
                    param_markdown_docstring = convert(param_docstring) if param_docstring else ""
                except Exception:
                    param_markdown_docstring = param_docstring

                params.append({
                    "label": param.name,
                    "documentation": param_markdown_docstring
                })
            
            # Convert docstring to markdown
            raw_docstring = sig.docstring(raw=True) or ""
            try:
                markdown_docstring = convert(raw_docstring) if raw_docstring else ""
            except Exception:
                markdown_docstring = raw_docstring

            sig_results.append({
                "label": sig.to_string(),
                "documentation": {
                    "value": markdown_docstring,
                    "isTrusted": True
                },
                "parameters": params,
                "activeParameter": sig.index if sig.index is not None else 0
            })
            
        return {
            "signatures": sig_results,
            "activeSignature": main_active_signature,
            "activeParameter": main_active_parameter
        }
    except Exception as e:
        return None

__all__ = ["get_completions", "get_hover", "get_signature_help"]
