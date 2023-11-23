<?php

use PHPUnit\Framework\TestCase;
use Math\Addition;

class AdditionTest extends TestCase {
    public function testAdd() {
        $sut = new Addition();
        $result = $sut->add(5, 5);
        $this->assertEquals(10, $result);
    }
}
