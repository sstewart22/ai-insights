export const JsonTransformer = {
  to: (value: any) =>
    value === null || value === undefined ? null : JSON.stringify(value),

  from: (value: string | null) =>
    typeof value === 'string' ? JSON.parse(value) : value,
};
