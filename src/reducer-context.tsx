/**
 * @license
 * MIT License
 *
 * Copyright (c) 2020 Alexis Munsayac
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 *
 * @author Alexis Munsayac <alexis.munsayac@gmail.com>
 * @copyright Alexis Munsayac 2020
 */
import React, {
  Dispatch, Reducer, useReducer, useCallback, useMemo,
} from 'react';
import { ContextInterface } from './types';
import createHookedContext from './hooked-context';

export interface ReducerContextProviderProps<State> {
  value?: State;
  children?: React.ReactNode;
}

export interface ReducerContextConsumerProps<State, Action> {
  children: (value: State, set: Dispatch<Action>) => JSX.Element;
}
export interface ReducerContextSelectorProps<State, R, Action> {
  selector: (value: State) => R;
  children: (value: R, set: Dispatch<Action>) => JSX.Element;
}

export interface ReducerContextSelectorsProps<State, R extends any[], Action> {
  selector: (value: State) => R;
  children: (value: R, set: Dispatch<Action>) => JSX.Element;
}

type BaseContextInterface<State, Action> =
  ContextInterface<
    ReducerContextProviderProps<State>,
    ReducerContextConsumerProps<State, Action>
  >;

type ContextValue<State, Action> = [State, Dispatch<Action>];

export interface ReducerContextInterface<State, Action>
  extends BaseContextInterface<State, Action> {
  useState(): ContextValue<State, Action>;
  useValue(): State;
  useDispatch(): Dispatch<Action>;
  useSelectedValue<R>(selector: (value: State) => R): R;
  useSelectedState<R>(selector: (value: State) => R): [R, Dispatch<Action>];
  useSelectedValues<R extends any[]>(selector: (value: State) => R): R;
  useSelectedStates<R extends any[]>(selector: (value: State) => R): [R, Dispatch<Action>];

  Selector<R>(props: ReducerContextSelectorProps<State, R, Action>): JSX.Element;
  Selectors<R extends any[]>(props: ReducerContextSelectorsProps<State, R, Action>): JSX.Element;
}

export default function createReducerContext<State, Action>(
  reducer: Reducer<State, Action>,
  defaultValue: State,
): ReducerContextInterface<State, Action> {
  type ReducerTuple = ContextValue<State, Action>;
  type ReducerProvider = ReducerContextProviderProps<State>;

  const InternalContext = createHookedContext<ReducerTuple, ReducerProvider>(
    ({ value }) => (
      useReducer(reducer, value ?? defaultValue)
    ),
  );

  function useState(): ReducerTuple {
    return InternalContext.useValue();
  }

  function useValue(): State {
    const internalSelector = useCallback(([next]): State => (
      next
    ), []);

    return InternalContext.useSelectedValue(internalSelector);
  }

  function useDispatch(): Dispatch<Action> {
    const internalSelector = useCallback(([, dispatch]): Dispatch<Action> => (
      dispatch
    ), []);

    return InternalContext.useSelectedValue(internalSelector);
  }

  function useSelectedState<R>(selector: (value: State) => R): ContextValue<R, Action> {
    const internalSelector = useCallback(([next, dispatch]): ContextValue<R, Action> => (
      [selector(next), dispatch]
    ), [selector]);

    return InternalContext.useSelectedValues(internalSelector);
  }

  function useSelectedValue<R>(selector: (value: State) => R): R {
    const internalSelector = useCallback(([next]): R => (
      selector(next)
    ), [selector]);

    return InternalContext.useSelectedValue(internalSelector);
  }

  function useSelectedStates<R extends any[]>(
    selector: (value: State) => R,
  ): ContextValue<R, Action> {
    const internalSelector = useCallback(([next, dispatch]) => (
      [dispatch, ...selector(next)]
    ), [selector]);

    const values = InternalContext.useSelectedValues(internalSelector);

    return useMemo<ContextValue<R, Action>>(() => {
      const [dispatch, ...states] = values;

      return [states as R, dispatch];
    }, [values]);
  }

  function useSelectedValues<R extends any[]>(selector: (value: State) => R): R {
    const internalSelector = useCallback(([next]): R => (
      selector(next)
    ), [selector]);

    return InternalContext.useSelectedValues(internalSelector);
  }

  function Provider(
    { value, children }: ReducerProvider,
  ): JSX.Element {
    return (
      <InternalContext.Provider value={value}>
        { children }
      </InternalContext.Provider>
    );
  }

  function Consumer(
    { children }: ReducerContextConsumerProps<State, Action>,
  ): JSX.Element {
    const [state, setState] = useState();

    return children(state, setState);
  }

  function Selector<R>(
    { selector, children }: ReducerContextSelectorProps<State, R, Action>,
  ): JSX.Element {
    const [state, setState] = useSelectedState(selector);

    return children(state, setState);
  }

  function Selectors<R extends any[]>(
    { selector, children }: ReducerContextSelectorsProps<State, R, Action>,
  ): JSX.Element {
    const [state, setState] = useSelectedStates(selector);

    return children(state, setState);
  }

  return {
    Provider,
    Consumer,
    Selector,
    Selectors,

    set displayName(value: string | undefined) {
      InternalContext.displayName = value;
    },
    get displayName(): string | undefined {
      return InternalContext.displayName;
    },

    useState,
    useValue,
    useDispatch,
    useSelectedState,
    useSelectedValue,
    useSelectedStates,
    useSelectedValues,
  };
}
