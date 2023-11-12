<?php

namespace Science;

class Weather {
    public function isWarm($celcius) {
        return $celcius > 20;
    }

    public function isCold($celcius) {
        return $celcius < 5;
    }
}
