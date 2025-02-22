import { useCallback, useEffect, useRef } from 'react';
import { useFormikContext } from 'formik';
import isEqual from 'react-fast-compare';
import useComponentWillMount from './useComponentWillMount';
import usePrevious from './usePrevious';

export interface FormikRememberProps<T> {
  name: string;

  debounceWaitMs?: number;
  clearOnOnmount?: boolean;
  saveOnlyOnSubmit?: boolean;

  parse?: (rawString: string) => T;
  dump?: (data: T) => string;

  setData?: (name: string, stringData: string) => void;
  getData?: (name: string) => string | undefined | null;
  clearData?: (name: string) => void;

  onLoaded?: (data: T) => never;
}

const DEFAULT_PROPS = {
  debounceWaitMs: 300,
  clearOnOnmount: true,
  saveOnlyOnSubmit: false,
  parse: JSON.parse,
  dump: JSON.stringify,
};

const FormikRemember = <T extends any = any>(props: FormikRememberProps<T>) => {
  const {
    getData = window.localStorage.getItem.bind(window.localStorage),
    setData = window.localStorage.setItem.bind(window.localStorage),
    clearData = window.localStorage.removeItem.bind(window.localStorage),
    name,
    parse,
    dump,
    clearOnOnmount,
    saveOnlyOnSubmit,
    onLoaded,
  } = Object.assign(DEFAULT_PROPS, props);

  const { setValues, values, isSubmitting, isValid } = useFormikContext<T>();
  const wasSubmitting = usePrevious(isSubmitting);

  const $savedValues = useRef<T>();

  // Debounce doesn't work with tests
  const saveForm = useCallback(
    (data: T) => {
      const stringData = dump(data);

      setData(name, stringData);
    },
    [dump, setData, name]
  );

  // Load state from storage
  useComponentWillMount(() => {
    const stringData = getData(name);

    if (stringData) {
      const savedValues = parse(stringData);

      if (!isEqual(savedValues, values)) {
        $savedValues.current = savedValues;
        setValues(savedValues);

        if (onLoaded) {
          onLoaded(savedValues);
        }
      }
    }
  })
  // Save state
  useEffect(
    () => {
      if (!saveOnlyOnSubmit && !isEqual(values, $savedValues.current)) {
        saveForm(values);
      }
    },
    [values, saveForm, saveOnlyOnSubmit]
  );

  // Clear data after unmount
  useEffect(
    () => () => {
      if (clearOnOnmount && isSubmitting) {
        clearData(name);
      }
    },
    [clearOnOnmount, isSubmitting, clearData, name]
  );

  // saveOnlyOnSubmit
  useEffect(
    () => () => {
      if (
        saveOnlyOnSubmit &&
        wasSubmitting &&
        !isSubmitting &&
        isValid
      ) {
        saveForm(values);
      }
    },
    [saveOnlyOnSubmit, isSubmitting, saveForm, values]
  );

  return null;
};

export default FormikRemember;
