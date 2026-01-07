import assert from 'assert';
import timeExpression from '../../src/objects/timeExpression.js';

describe('timeExpression', function() {
    it('resolves now to current clock time', function() {
        const now = new Date();
        const result = timeExpression('now', () => {return now}, () => {return new Date(0)}).resolve();
        assert(result.getTime() === now.getTime());
    });

    it('resolves beginning to beginning time', function() {
        const begin = new Date(Math.floor(Math.random() * 1000000000000));
        const result = timeExpression('beginning', () => {return new Date()}, () => {return begin}).resolve();
        assert(result.getTime() === begin.getTime());
    });

    it('resolves ISO8601 date string', function() {
        const timestamp = new Date(Math.floor(Math.random() * 1000000000000));
        const iso = timestamp.toISOString();
        const result = timeExpression(iso, () => {return new Date()}, () => {return new Date(0)}).resolve();
        assert(result.getTime() === timestamp.getTime());
    });

    it('resolves now minus seconds', function() {
        const now = new Date();
        const seconds = Math.floor(Math.random() * 60) + 1;
        const result = timeExpression(`now-${seconds}s`, () => {return now}, () => {return new Date(0)}).resolve();
        assert(result.getTime() === now.getTime() - seconds * 1000);
    });

    it('resolves now minus minutes', function() {
        const now = new Date();
        const minutes = Math.floor(Math.random() * 60) + 1;
        const result = timeExpression(`now-${minutes}m`, () => {return now}, () => {return new Date(0)}).resolve();
        assert(result.getTime() === now.getTime() - minutes * 60 * 1000);
    });

    it('resolves now minus hours', function() {
        const now = new Date();
        const hours = Math.floor(Math.random() * 24) + 1;
        const result = timeExpression(`now-${hours}h`, () => {return now}, () => {return new Date(0)}).resolve();
        assert(result.getTime() === now.getTime() - hours * 60 * 60 * 1000);
    });

    it('resolves now minus days', function() {
        const now = new Date();
        const days = Math.floor(Math.random() * 7) + 1;
        const result = timeExpression(`now-${days}d`, () => {return now}, () => {return new Date(0)}).resolve();
        assert(result.getTime() === now.getTime() - days * 24 * 60 * 60 * 1000);
    });

    it('resolves now minus weeks', function() {
        const now = new Date();
        const weeks = Math.floor(Math.random() * 4) + 1;
        const result = timeExpression(`now-${weeks}w`, () => {return now}, () => {return new Date(0)}).resolve();
        assert(result.getTime() === now.getTime() - weeks * 7 * 24 * 60 * 60 * 1000);
    });

    it('resolves now minus months', function() {
        const now = new Date();
        const months = Math.floor(Math.random() * 12) + 1;
        const result = timeExpression(`now-${months}M`, () => {return now}, () => {return new Date(0)}).resolve();
        assert(result.getTime() === now.getTime() - months * 30 * 24 * 60 * 60 * 1000);
    });

    it('resolves now plus hours', function() {
        const now = new Date();
        const hours = Math.floor(Math.random() * 24) + 1;
        const result = timeExpression(`now+${hours}h`, () => {return now}, () => {return new Date(0)}).resolve();
        assert(result.getTime() === now.getTime() + hours * 60 * 60 * 1000);
    });

    it('resolves beginning minus days', function() {
        const begin = new Date();
        const days = Math.floor(Math.random() * 7) + 1;
        const result = timeExpression(`beginning-${days}d`, () => {return new Date()}, () => {return begin}).resolve();
        assert(result.getTime() === begin.getTime() - days * 24 * 60 * 60 * 1000);
    });

    it('returns clock time for invalid expression', function() {
        const now = new Date();
        const result = timeExpression('invalid!@#', () => {return now}, () => {return new Date(0)}).resolve();
        assert(result.getTime() === now.getTime());
    });
});
