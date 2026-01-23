
filename = r"e:\Code\surf_website\waves-and-waders\components\graphs\ForecastWindChart.tsx"

with open(filename, 'r', encoding='utf-8') as f:
    lines = f.readlines()

stack = []
for i, line in enumerate(lines):
    for j, char in enumerate(line):
        if char == '{':
            stack.append((i + 1, j + 1))
        elif char == '}':
            if not stack:
                print(f"Extra closing brace at line {i + 1}, col {j + 1}")
            else:
                stack.pop()

if stack:
    for line, col in stack:
        print(f"Unclosed brace at line {line}, col {col}")
else:
    print("Braces are balanced.")

stack_paren = []
for i, line in enumerate(lines):
    for j, char in enumerate(line):
        if char == '(':
            stack_paren.append((i + 1, j + 1))
        elif char == ')':
            if not stack_paren:
                print(f"Extra closing parenthesis at line {i + 1}, col {j + 1}")
            else:
                stack_paren.pop()
if stack_paren:
    for line, col in stack_paren:
        print(f"Unclosed parenthesis at line {line}, col {col}")
else:
    print("Parentheses are balanced.")
