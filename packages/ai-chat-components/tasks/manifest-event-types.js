/*
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

function unalias(model, symbol) {
  return symbol?.flags & model.ts.SymbolFlags.Alias
    ? model.checker.getAliasedSymbol(symbol)
    : symbol;
}

function namedType(model, name, context) {
  const { ts, checker } = model;
  const parts = name.split('.');
  let symbol = checker.resolveName(
    parts.shift(),
    context,
    ts.SymbolFlags.Type | ts.SymbolFlags.Namespace | ts.SymbolFlags.Alias,
    false
  );
  symbol = unalias(model, symbol);
  for (const part of parts) {
    if (!symbol) {
      throw new Error(`Unresolved public detail type ${name}.`);
    }
    symbol = unalias(
      model,
      checker.getExportsOfModule(symbol).find((entry) => entry.name === part)
    );
  }
  if (!symbol) {
    throw new Error(`Unresolved public detail type ${name}.`);
  }
  return checker.getDeclaredTypeOfSymbol(symbol);
}

function usableType(model, type) {
  return (
    type &&
    !(
      type.flags &
      (model.ts.TypeFlags.Any |
        model.ts.TypeFlags.Unknown |
        model.ts.TypeFlags.Never |
        model.ts.TypeFlags.TypeParameter)
    )
  );
}

function variants(model, type) {
  if (!usableType(model, type)) {
    throw new Error(
      `Unsupported detail type ${type && model.checker.typeToString(type)}.`
    );
  }
  return type.isUnion()
    ? type.types.flatMap((entry) => variants(model, entry))
    : [type];
}

function documentedVariants(model, node, context) {
  const { ts } = model;
  if (ts.isUnionTypeNode(node)) {
    return node.types.flatMap((entry) =>
      documentedVariants(model, entry, context)
    );
  }
  if (
    ts.isLiteralTypeNode(node) &&
    node.literal.kind === ts.SyntaxKind.NullKeyword
  ) {
    return [null];
  }
  if (ts.isTypeReferenceNode(node) && !node.typeArguments?.length) {
    return variants(model, namedType(model, node.typeName.getText(), context));
  }
  throw new Error(`Unsupported public detail contract ${node.getText()}.`);
}

function documentedType(model, text, context) {
  const { ts } = model;
  const source = ts.createSourceFile(
    'event-contract.ts',
    `type Contract = ${text};`,
    ts.ScriptTarget.Latest,
    true
  );
  const node = source.statements[0]?.type;
  if (
    source.parseDiagnostics.length ||
    !node ||
    !ts.isTypeReferenceNode(node)
  ) {
    throw new Error(
      `Expected a typed CustomEvent contract, received ${text ?? '<missing>'}.`
    );
  }
  if (
    node.typeName.getText() === 'CustomEvent' &&
    node.typeArguments?.length === 1
  ) {
    return {
      custom: true,
      types: documentedVariants(model, node.typeArguments[0], context),
    };
  }
  if (
    !node.typeArguments?.length &&
    node.typeName.getText() !== 'CustomEvent'
  ) {
    return {
      custom: false,
      types: variants(
        model,
        namedType(model, node.typeName.getText(), context)
      ),
    };
  }
  throw new Error(
    `Expected a typed CustomEvent contract, received ${text ?? '<missing>'}.`
  );
}

function producerType(model, producer) {
  const { ts, checker } = model;
  const generic = producer.constructor.typeArguments;
  const satisfies =
    producer.detail && ts.isSatisfiesExpression(producer.detail)
      ? producer.detail
      : undefined;
  const node = generic?.length === 1 ? generic[0] : satisfies?.type;
  if (!node) {
    throw new Error(
      'The producer needs an explicit CustomEvent detail type or a detail satisfies contract.'
    );
  }
  if (ts.isIndexedAccessTypeNode(node)) {
    const index = checker.getTypeFromTypeNode(node.indexType);
    if (!(index.flags & ts.TypeFlags.TypeParameter)) {
      return variants(model, checker.getTypeFromTypeNode(node));
    }
    const name = parameter(model, producer.constructor.arguments?.[0]);
    if (!name || checker.getTypeAtLocation(name.name) !== index) {
      throw new Error(
        'A generic detail map must use the event name parameter as its index.'
      );
    }
    const map = checker.getTypeFromTypeNode(node.objectType);
    const property = map.getProperty(producer.name);
    if (!property) {
      throw new Error(`The detail map has no entry for ${producer.name}.`);
    }
    return variants(
      model,
      checker.getTypeOfSymbolAtLocation(property, producer.constructor)
    );
  }
  return variants(model, checker.getTypeFromTypeNode(node));
}

function assignable(model, source, target) {
  const sourceNull =
    source === null || Boolean(source.flags & model.ts.TypeFlags.Null);
  const targetNull =
    target === null || Boolean(target.flags & model.ts.TypeFlags.Null);
  if (sourceNull || targetNull) {
    return sourceNull && targetNull;
  }
  return model.checker.isTypeAssignableTo(source, target);
}

function covered(model, source, target) {
  return source.every((entry) =>
    target.some((other) => assignable(model, entry, other))
  );
}

function callableSymbol(model, owner) {
  return model.symbol(owner.name ?? owner.parent?.name);
}

function parameter(model, expression) {
  return model.symbol(expression)?.declarations?.find(model.ts.isParameter);
}

function helperCalls(model, producer) {
  const { ts } = model;
  let owner = producer.constructor.parent;
  while (owner && !ts.isFunctionLike(owner)) {
    owner = owner.parent;
  }
  return owner ? (model.calls.get(callableSymbol(model, owner)) ?? []) : [];
}

function helperPayloads(model, producer) {
  const detail = parameter(model, producer.detail);
  const name = parameter(model, producer.constructor.arguments?.[0]);
  if (!detail || !name || detail.parent !== name.parent) {
    return undefined;
  }
  const owner = detail.parent;
  const nameIndex = owner.parameters.indexOf(name);
  const detailIndex = owner.parameters.indexOf(detail);
  const calls = model.calls.get(callableSymbol(model, owner)) ?? [];
  return calls
    .filter((call) =>
      model.values(call.arguments[nameIndex]).includes(producer.name)
    )
    .map((call) => ({
      node: call.arguments[detailIndex] ?? detail.initializer,
      origin: call,
    }));
}

function checkPayload(model, producer, expected, add) {
  const payloads = helperPayloads(model, producer) ?? [
    { node: producer.detail, origin: producer.constructor },
  ];
  for (const payload of payloads) {
    if (!payload.node) {
      if (!expected.some((type) => assignable(model, null, type))) {
        add(
          payload.origin,
          `${producer.name} needs its declared detail payload.`
        );
      }
      continue;
    }
    const actual = variants(
      model,
      model.checker.getTypeAtLocation(payload.node)
    );
    if (!covered(model, actual, expected)) {
      add(
        payload.node,
        `${producer.name} payload does not match its public detail type.`
      );
    }
  }
}

function payloadInitializers(model, expression, seen = new Set()) {
  if (!expression || seen.has(expression)) {
    return [];
  }
  seen.add(expression);
  const initializer = model.symbol(expression)?.valueDeclaration?.initializer;
  if (!initializer) {
    return [];
  }
  return [initializer, ...payloadInitializers(model, initializer, seen)];
}

function relevantDiagnostics(model, scopes, cache, add) {
  for (const scope of scopes) {
    const source = scope.getSourceFile();
    if (!cache.has(source)) {
      cache.set(source, model.program.getSemanticDiagnostics(source));
    }
    for (const diagnostic of cache.get(source)) {
      if (
        diagnostic.start >= scope.getStart() &&
        diagnostic.start < scope.end
      ) {
        add(
          scope,
          `Invalid event producer: ${model.ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')}`
        );
      }
    }
  }
}

function rejectUnsafeAssertions(model, scopes, add) {
  for (const scope of scopes) {
    model.visit(scope, (node) => {
      if (
        !model.ts.isAsExpression(node) &&
        !model.ts.isTypeAssertionExpression(node)
      ) {
        return;
      }
      const type = model.checker.getTypeFromTypeNode(node.type);
      if (type.flags & (model.ts.TypeFlags.Any | model.ts.TypeFlags.Unknown)) {
        add(
          node,
          'An event producer cannot bypass its detail contract with any or unknown.'
        );
      }
    });
  }
}

function contractsFor(producer, pairs) {
  const protocol = producer.protocol
    ? (producer.tags ?? [])
        .filter((tag) => tag.name === producer.name)
        .map((tag) => ({ type: tag.type, context: producer.protocol }))
    : [];
  const associated = pairs
    .filter(
      (pair) =>
        pair.name === producer.name &&
        (pair.producers
          ? pair.producers.includes(producer)
          : pair.producer === producer || pair.element === producer.element)
    )
    .map((pair) => ({ pair, type: pair.type, context: pair.element.node }));
  return [...protocol, ...associated];
}

function validateProducer(
  model,
  producer,
  { pairs, contractsByPair, diagnostics, add }
) {
  const scopes = [
    producer.constructor,
    ...helperCalls(model, producer),
    ...payloadInitializers(model, producer.detail),
  ];
  relevantDiagnostics(model, scopes, diagnostics, add);
  rejectUnsafeAssertions(model, scopes, add);
  const custom = producer.custom !== false;
  const actual = custom
    ? producerType(model, producer)
    : variants(model, model.checker.getTypeAtLocation(producer.constructor));
  const contracts = contractsFor(producer, pairs);
  if (!contracts.length) {
    throw new Error(`${producer.name} has no public type contract.`);
  }
  for (const contract of contracts) {
    const expected = contract.pair
      ? contractsByPair.get(contract.pair)
      : documentedType(model, contract.type, contract.context);
    if (!expected) {
      continue;
    }
    if (
      custom !== expected.custom ||
      !covered(model, actual, expected.types) ||
      !covered(model, expected.types, actual)
    ) {
      add(
        producer.constructor,
        `${producer.name} producer detail type differs from ${contract.type}.`
      );
    }
    if (custom && expected.custom) {
      checkPayload(model, producer, expected.types, add);
    }
  }
}

export function validateEventTypes(model, producers, pairs) {
  const errors = new Set();
  const diagnostics = new Map();
  const add = (node, message) =>
    errors.add(`${model.location(node)}: ${message}`);
  const contractsByPair = new Map();
  for (const pair of pairs) {
    try {
      contractsByPair.set(
        pair,
        documentedType(model, pair.type, pair.element.node)
      );
    } catch (error) {
      add(pair.element.node, `${pair.name}: ${error.message}`);
    }
  }
  for (const producer of producers) {
    try {
      validateProducer(model, producer, {
        pairs,
        contractsByPair,
        diagnostics,
        add,
      });
    } catch (error) {
      add(producer.constructor, `${producer.name}: ${error.message}`);
    }
  }
  return [...errors];
}
