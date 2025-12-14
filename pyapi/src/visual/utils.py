def parse_vars(*vars: str):
    """
    Parses variable names from input strings.
    Args:
        *vars: Additional variable names as individual strings or 
               comma-separated strings like "a, b, c"

    Examples:
        parse_vars('x', 'i', 'global_var')
        parse_vars('a, b, c')
        
    Returns:
        list of str: The parsed variable names.
    """
    l: list[str] = []
    
    for item in vars:
        if not isinstance(item, str):
            continue
        for part in item.split(','):
            clean = part.strip()
            if not clean: 
                continue
            l.append(clean)
    return l

