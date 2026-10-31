// -*- mode: java; c-basic-offset: 2; -*-
// Copyright 2023 MIT, All rights reserved
// Released under the Apache License, Version 2.0
// http://www.apache.org/licenses/LICENSE-2.0

'use strict';

import {LexicalVariablesPlugin} from './core.js';
import './blocks.js';
import './generators.js';

export {LexicalVariablesPlugin};
export {lexical_variable_get, lexical_variable_set} from './blocks/variable-get-set.js';
