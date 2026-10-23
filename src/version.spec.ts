import test = require('node:test');
import assert = require('node:assert');
import version = require('./version');

test('parses a 3 part version', () => {
    assert.strictEqual(version.ParseVersion('208.0.0\n'), '208.0.0');
});

test('parses a 4 part version', () => {
    assert.strictEqual(version.ParseVersion('Oculus Platform Command Line Utility\n1.103.0.4\n'), '1.103.0+4');
});

test('throws when no version is found', () => {
    assert.throws(() => version.ParseVersion('command not found'), /Failed to find a valid version match/);
});
