/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { expect } from '@open-wc/testing';

import {
  detectLanguage,
  mapLanguageName,
} from '../src/codemirror/language-utils.js';

describe('mapLanguageName', () => {
  it('maps common aliases to canonical names', () => {
    expect(mapLanguageName('js')).to.equal('JavaScript');
    expect(mapLanguageName('ts')).to.equal('TypeScript');
    expect(mapLanguageName('py')).to.equal('Python');
    expect(mapLanguageName('  YML  ')).to.equal('YAML');
  });

  it('returns null for empty, unknown, and plaintext hints', () => {
    expect(mapLanguageName(null)).to.equal(null);
    expect(mapLanguageName(undefined)).to.equal(null);
    expect(mapLanguageName('')).to.equal(null);
    expect(mapLanguageName('unknown')).to.equal(null);
    expect(mapLanguageName('plaintext')).to.equal(null);
  });

  it('passes through names it has no alias for', () => {
    expect(mapLanguageName('Elixir')).to.equal('Elixir');
  });
});

describe('detectLanguage', () => {
  it('returns null for empty input', () => {
    expect(detectLanguage('')).to.equal(null);
    expect(detectLanguage('   \n  ')).to.equal(null);
  });

  describe('pattern-based formats take precedence', () => {
    it('detects Markdown', () => {
      expect(detectLanguage('# Heading\n\nSome prose.')).to.equal('Markdown');
    });

    it('detects diff', () => {
      expect(
        detectLanguage('diff --git a/x b/x\n@@ -1 +1 @@\n-old\n+new')
      ).to.equal('diff');
    });

    it('detects shell via shebang', () => {
      expect(detectLanguage('#!/bin/bash\necho "hi"')).to.equal('Shell');
    });

    it('detects JSON', () => {
      expect(detectLanguage('{\n  "name": "example"\n}')).to.equal('JSON');
    });
  });

  describe('signature-based detection', () => {
    it('detects PHP', () => {
      expect(detectLanguage('<?php\necho "hello";')).to.equal('PHP');
    });

    it('detects HTML', () => {
      expect(
        detectLanguage('<!DOCTYPE html>\n<html><body>hi</body></html>')
      ).to.equal('HTML');
    });

    it('detects bare markup as HTML once script languages are ruled out', () => {
      expect(detectLanguage('<div class="card"><p>hi</p></div>')).to.equal(
        'HTML'
      );
    });

    it('prefers the script language over markup for JSX', () => {
      expect(
        detectLanguage(
          'export function Card() {\n  return <div className="card">hi</div>;\n}'
        )
      ).to.equal('JavaScript');
    });

    it('prefers TypeScript over markup for TSX', () => {
      expect(
        detectLanguage(
          'export function Card({ title }: Props) {\n  return <div>{title}</div>;\n}'
        )
      ).to.equal('TypeScript');
    });

    it('detects Go', () => {
      expect(
        detectLanguage(
          'package main\n\nfunc main() {\n\tx := 1\n\tfmt.Println(x)\n}'
        )
      ).to.equal('Go');
    });

    it('detects Java', () => {
      expect(
        detectLanguage(
          'public class Main {\n  public static void main(String[] args) {\n    System.out.println("hi");\n  }\n}'
        )
      ).to.equal('Java');
    });

    it('detects C++', () => {
      expect(
        detectLanguage(
          '#include <iostream>\nint main() {\n  std::cout << 1 << std::endl;\n}'
        )
      ).to.equal('C++');
    });

    it('detects C', () => {
      expect(
        detectLanguage(
          '#include <stdio.h>\nint main() {\n  printf("hi");\n  return 0;\n}'
        )
      ).to.equal('C');
    });

    it('detects Python', () => {
      expect(detectLanguage('def hello():\n    print("Hello")')).to.equal(
        'Python'
      );
      expect(detectLanguage('from os import path\n')).to.equal('Python');
    });

    it('detects Ruby', () => {
      expect(detectLanguage('puts "hello"')).to.equal('Ruby');
      expect(detectLanguage('[1, 2].each do |n|\n  puts n\nend')).to.equal(
        'Ruby'
      );
    });

    it('detects JavaScript', () => {
      expect(
        detectLanguage('const greeting = "hi";\nconsole.log(greeting);')
      ).to.equal('JavaScript');
    });

    it('detects CSS', () => {
      expect(
        detectLanguage('.button {\n  background-color: #000;\n}')
      ).to.equal('CSS');
    });
  });

  describe('TypeScript disambiguation', () => {
    it('prefers TypeScript over JavaScript when type syntax is present', () => {
      expect(
        detectLanguage('interface User {\n  name: string;\n  age: number;\n}')
      ).to.equal('TypeScript');
    });

    it('upgrades otherwise-JavaScript code carrying type annotations', () => {
      expect(
        detectLanguage('const add = (a: number, b: number) => a + b;')
      ).to.equal('TypeScript');
    });

    it('leaves plain JavaScript alone', () => {
      expect(detectLanguage('const add = (a, b) => a + b;')).to.equal(
        'JavaScript'
      );
    });
  });

  it('returns null when nothing matches', () => {
    expect(detectLanguage('lorem ipsum dolor sit amet')).to.equal(null);
  });
});
