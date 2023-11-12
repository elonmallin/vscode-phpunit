<?php

use PHPUnit\Framework\TestCase;
use Science\Weather;

class WeatherTest extends TestCase {
    public function testIsCold() {
        $sut = new Weather();
        $this->assertFalse($sut->isCold(21), "Expected isCold to return false for temperature 21");
        $this->assertTrue($sut->isCold(4), "Expected isCold to return true for temperature 4");
    }

    public function testIsWarm() {
        $sut = new Weather();
        $this->assertTrue($sut->isWarm(21), "Expected isWarm to return true for temperature 21");
        $this->assertFalse($sut->isWarm(19), "Expected isWarm to return false for temperature 19");
    }
}
