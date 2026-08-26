# Tally

A composable, source-driven status effect framework for deriving and replicating gameplay state.

Tally models gameplay state as Properties modified by Sources.
Rather than treating status effects as first-class objects, effects emerge
from combinations of Sources, Modifiers, Properties, and Descriptors.

## Features

- composable property modifiers
- configurable source priorities
- deterministic ordering
- duplicate policies
- descriptors for derived/runtime-maintained state
- transport-agnostic replication
- snapshots and delta replication
- strongly typed TypeScript API

## Installation

Tally is available as an npm package.

`npm install tally-effects`

## Quick Start

This example defines a `MovementSpeed` Property with a default value of 16. While a `Sprinting` source is active, it contributes a multiplier to that Property. Destroying the Source removes its contribution and restores the resolved value to 16.

```ts
const MovementSpeed = defineNumberProperty({
    name: "MovementSpeed",
    defaultValue: 16,
});

const Sprinting = defineSourceType<number>({
    name: "Sprinting",
    priority: 100,
    contribute: (multiplier) => [
        MovementSpeed.multiply(multiplier),
    ],
});

const agent = new AgentState(player);

const sprint = agent.addSource(Sprinting, 1.5);

agent.get(MovementSpeed);
// 24

sprint?.destroy();

agent.get(MovementSpeed);
// 16
```

The basic flow is:

```
Source
  ↓ contributes
Modifier
  ↓ modifies
Property
  ↓ resolves to
final value
```

### Properties

Properties define values that Tally resolves. A Property provides a default value and defines how its Modifiers combine.

```ts
const HealthRegen = defineNumberProperty({
    name: "HealthRegen",
    defaultValue: 1,
});
```

### Sources

A Source is a runtime cause of state attached to an AgentState. Each Source is an instance of a SourceType, which defines the Modifiers that Source contributes.

A SourceType defines how Source data becomes modifiers:

```ts
const Poisoned = defineSourceType<PoisonData>({
    name: "Poisoned",
    priority: 100,
    contribute: (data) => [
        HealthRegen.multiply(data.regenMultiplier),
    ],
});
```

### Priorities and Deterministic Ordering

Modifiers are resolved deterministically. Priority is considered first, followed by provenance ordering and Source sequence. The result does not depend on collection iteration order or the local order in which replicated state arrived.

### Duplicate Policies

A duplicate policy determines what happens when a source is added when a matching type already exists within the agent. The policies are listed below:

| Policy | Behavior |
| ------ | -------- |
| `allow` | create another instance |
| `ignore` | reject the new instance |
| `replace` | destroy the old instance and create the new one |
| `reconcile` | let application code merge incoming data into the existing instance |

### Descriptors

Some Sources cannot be represented by replicated data alone. A proximity-based Source, for example, may depend on an object that exists differently on the server and client.

Descriptors are optional instances that separate what state should exist from how that state is produced in the current runtime. A Descriptor contains the portable data, while a locally registered DescriptorHandler uses that data to create and maintain its Source.

```
Descriptor
    ↓ runtime handler
DescriptorBinding
    ↓ adds
Source
    ↓ contributes
Modifiers
```

For example, a `ProximityFear` Descriptor can identify what the player should be afraid of without containing server- or client-specific logic for measuring that object's proximity.

```ts
const ProximityFear = defineDescriptorType<
    ProximityData,
    FearData
>({
    name: "ProximityFear",
    source: Fear, // source type
    replication: {
        serialize: ...,
        deserialize: ...,
    },
});
```

Then on a TallyContext or AgentState object, a handler can be injected for that DescriptorType.

```ts
tally.registerDescriptorHandler(
    ProximityFear,
    (ctx, data) => {
        const source = ctx.addSource(
            calculateFear(data)
        );

        if (!source)
            return;

        return {
            source,
            update(next) {
                source.set(
                    calculateFear(next)
                );
            },
            destroy() {
                source.destroy();
            },
        };
    }
);
```

Descriptor handlers should be registered before creating AgentStates.

### Replication

Tally emits replication state/events, but does not own your networking layer. Developers are expected to implement how to transport the data.

Tally does offer Receivers for accepting replication events.

The replication flow looks like:
```
Server AgentState
      ↓
Tally replication event
      ↓
your transport
      ↓
SourceReceiver / DescriptorReceiver
      ↓
Client AgentState
```

## Status

Tally is currently pre-1.0. Public APIs may evolve as the library gains real-world usage.