Example Module
==============

The Example Module comprises of a single "projects" API.

Important Files
---------------

    ./index.js              - configures each of the APIs
    ./scripts/setup.js      - setup the database for each API
    ./scripts/teardown.js   - destroy the database for each API (use with caution)
    ./apis/*                - configuration for individual APIs


install:

    npm install
    foxx-manager install . /example --server.password $FOXX_PASSWD

upgrade:

    foxx-manager replace . /example --server.password $FOXX_PASSWD

un-install:

    foxx-manager uninstall /example --server.password $FOXX_PASSWD

--------------------------------

Copyright (c) 2017 apigeeks.com

