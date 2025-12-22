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

__all__ = ["get_completions", "get_hover"]