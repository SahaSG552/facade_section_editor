export const VARIABLE_NAME_PATTERN = "[A-Za-z_][A-Za-z0-9_]*";
export const VARIABLE_NAME_RE = new RegExp(`^${VARIABLE_NAME_PATTERN}$`);
export const VARIABLE_TOKEN_RE_GLOBAL = new RegExp(`\\{\\s*(${VARIABLE_NAME_PATTERN})\\s*\\}`, "g");
export const VARIABLE_TOKEN_TEST_RE = new RegExp(`\\{\\s*${VARIABLE_NAME_PATTERN}\\s*\\}`);

export function isValidVariableName(name) {
    return VARIABLE_NAME_RE.test(String(name ?? "").trim());
}
