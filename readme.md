Typesafe state management for React applications.

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

You can embed observables in R. components: 
```typescript
function Html() {
    const rx$ = useMemo(() => from(getRandomNumber(1000)).pipe(delay(500)), [])
    return <R.div>Random number: {rx$}</R.div>
}

```

Components from R are reactive - every prop (including children) can be Observable. If observable doesn't immediately emit a value or emits an error, component is not rendered.

#### RxWrapper component

It can be used to transform regular components to reactive:

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

lift does pretty the same as RxWrapper, but it can be used if you need to use the reactive version of the component many times (it's hoc, creates new component)

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

### Atom

Atom is a special kind of observable. It has get, set and modify. Atoms can be created using `Atom.create`. Initial value should be supplied:

```typescript
const atom: Atom<number> = Atom.create(10)
atom.get() // is 10
atom.set(20) // sets value to 20
atom.modify(n => n + 1) // will be 21
```

#### Lenses

Lens allows to decompose atoms

```typescript
interface Form {
    firstName: string
    lastName: string
    gender: "male" | "female"
}

const form: Atom<Form> = Atom.create({ firstName: "Brad", lastName: "Pitt" })
const firstName: Atom<string> = form.lens("firstName")
const gender: Atom<"male" | "female"> = form.lens("gender")
```

See the types of lensed atoms (for firstName is `Atom<string>` and for gender is `Atom<"male" | "female">`).

When lensed atoms are changed, parent atoms are updated too. For example, if we change firstName using `firstName.set("Jack")`, then form Atom will be updated and will have `{ firstName: "Jack", lastName: "Pitt" }` value.

Custom lenses can be created too. This can be done using `Lens.create`.

When lensed atoms are created using `Atom.lens`, these values are cached, so when you invoke `form.lens("firstName")` multiple times, the same instance returned every time. This is useful to prevent React components rerendering.

#### Views

`ReadOnlyAtom` can be created using `view`:

```typescript
const firstNameView: ReadOnlyAtom<string> = form.view("firstName")
```

This kind of atoms can not be changed 

### Wrapped and cache

We have one more special kind of observable: Cache. It's an observable data that can be cached. It can be used as any other observable data.

Let's look closer at its type: `Cache<T>` is `Observable<Wrapped<T>>` (will see what's Wrapped bit later). To create Cache you need to invoke `new CacheImpl<T>(atom: Atom<CacheState<T>>, loader: () => Promise<T>)`

Every time when observer subsribes to cache, it checks if it's already loaded (in provided atom). If not, then cache tries to load data. When the data is loaded, observers get loaded data.

#### What's Wrapped and why we need it?

Wrapped is introduced by rixio to overcome some limitations of rxjs Observables. There are 2 goals:
- overcome some limitations with handling errors (observable can't be used anymore if error is thrown)
- wrapped observables always immediately emit values (if source observable didn't yet emit value, then `pending` is emitted) 

`Wrapped<T>` - is a wrapper type around any generic T. It has some states: "pending", "rejected", "fulfilled". 

#### rxjs operators for `Wrapped<T>`

We designed some operators to work with wrapped observables: map, flatMap, combineLatest, catchError
They work pretty the same way as regular rxjs operators, but support both wrapped and regular observables. Check out [tests](packages/rxjs-wrapped/src/operators.test.ts) to see some examples.
