import { expect, test } from 'vitest'
import { BoxedExpression, ComputeEngine } from '@cortex-js/compute-engine';


test('adds 1 + 1 to equal 2', () => {
    const sum = (a: number, b: number) => {
        return a + b
    }
    expect(sum(1, 1)).toBe(2)
})

test('evaluation of equation containing exponentials is correct', () => {
    // Consider an equation that has an exponential evaluation
    const latexEquation = "100^2 + 100"

    const ce = new ComputeEngine();

    const expression: BoxedExpression = ce.parse(latexEquation);

    expect(expression.N().valueOf()).toBe(10000 + 100)
})

test('cube root of a negative number has the correct result', () => {
    // cbrt(-8) = -2 on the real line; N() prefers the principal complex root
    // 1 + 1.732i, which is not what a person writing the equation means.
    const latexEquation = "\\sqrt[3]{-8}"

    const ce = new ComputeEngine();

    const expression: BoxedExpression = ce.parse(latexEquation);

    expect(expression.evaluate().valueOf()).toBe(-2)
})