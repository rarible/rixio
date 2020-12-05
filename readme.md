Typesafe state management for React applications

### Inspiration

This library is inspired by two other great libraries: [Calmm](https://github.com/calmm-js/) and [Focal](https://github.com/grammarly/focal/).

### The idea

Rixio provides these features:
- allows you to use reactive observables in React components
- has special kind of observable named Atom. Atoms can be decomposed using lenses
- provides consise way to handle different observable states (when observable doesn't emit values and when it emits errors)
- has caches which behave almost like any other observables and can be composed using usual operators (map, flatMap, combine etc.)

### Based on [rxjs](https://github.com/ReactiveX/rxjs) 

Rixio is based on rxjs and has many powerful features because of it.

## Examples and basic usage

You can check some working examples [here](https://codesandbox.io/s/github/roborox/rixio-examples).

### React examples

#### Reactive html components 

You can embed observables: 
```typescript
function Html() {
    const rx$ = useMemo(() => from(getRandomNumber(1000)).pipe(delay(500)), [])
    return <R.div>Random number: {rx$}</R.div>
}

```

Components from R are reactive - every prop (including children) can be Observable. If observable doesn't immediately emit a value, component is not rendered.

#### RxWrapper component

It can be used to transform regular components to reactive

```typescript
function Wrapper() {
    const actor$ = useMemo(() => from(getRandomActor()).pipe(delay(500)), [])
    return <RxWrapper component={DisplayPerson} person={actor$} pending="Loading..." />
}

type DisplayPersonProps = {
    person: Person
}

function DisplayPerson({ person: { firstName, lastName } }: DisplayPersonProps) {
    return (
        <>
            <div>First Name: {firstName}</div>
            <div>Last Name: {lastName}</div>
        </>
    )
}

```

RxWrapper here transforms DisplayPerson component to reactive alternative. This new component has the same props as DisplayPerson, but Observable can be used instead of any prop (including children).

#### lift function

lift does pretty the same as RxWrapper, but it can be used if you need to use reactive version of the component many times (it's hoc, creates new component)

```typescript
export const RxDisplayPerson = lift(DisplayPerson, {
	pending: "Wait, please",
	rejected: "Oops",
})

function UsingLifted() {
    const actor$ = useMemo(() => from(getRandomActor()).pipe(delay(500)), [])
    return <RxDisplayPerson person={actor$} />
}
```

Also, check second argument to lift function. You can define pending and rejected here. Check type of rejected prop here. It can be component or function 

### TBC
