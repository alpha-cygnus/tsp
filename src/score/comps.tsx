import {useEffect} from 'react';

import {parseBarCode, ParseError} from './parse';


export function Part({children}: {children: string}) {
  useEffect(() => {
    try {
      const bars = parseBarCode(children);
      console.log('parsed', bars);
    } catch (e) {
      if (e instanceof ParseError) {
        console.error(children, e.message, e.loc);
      } else {
        console.error('?', e);
      }
    }
  }, [children]);

  return null;
}
