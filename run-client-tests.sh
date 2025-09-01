#!/bin/bash

# Run only client tests with Jest
NODE_ENV=test npx jest --config jest.config.cjs $@
