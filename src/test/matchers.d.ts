import "vitest";

declare module "vitest" {
  // O type param é exigido pela declaração original da interface (Assertion<T>);
  // `any` vem do padrão oficial do vitest-axe para estender os matchers.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
  interface Assertion<T = any> {
    toHaveNoViolations(): void;
  }
  interface AsymmetricMatchersContaining {
    toHaveNoViolations(): void;
  }
}
