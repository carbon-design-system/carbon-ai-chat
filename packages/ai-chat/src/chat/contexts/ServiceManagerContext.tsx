/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React from "react";

import { ServiceManager } from "../services/ServiceManager";

/**
 * This file contains the instance of the {@link ServiceManagerContext} which is used to provide access to the
 * {@link ServiceManager}.
 */

const ServiceManagerContext = React.createContext<ServiceManager>(null);

export { ServiceManagerContext };
