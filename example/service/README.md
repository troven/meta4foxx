Example Module
==============


install:

    npm install && bower install
    foxx-manager replace . /example --server.password $FOXX_PASSWD --server.database $FOXX_DB --server.endpoint $FOXX_HOST --server.username $FOXX_USER

upgrade:

    foxx-manager install . /example --server.password $FOXX_PASSWD --server.database $FOXX_DB --server.endpoint $FOXX_HOST --server.username $FOXX_USER



# License

Copyright (c) 2017 apigeeks.com

License: Proprietary