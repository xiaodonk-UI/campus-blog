/** CSS模块类型声明（解决highlight.js等第三方CSS导入的TS报错） */
declare module '*.css' {
  const content: Record<string, string>;
  export default content;
}