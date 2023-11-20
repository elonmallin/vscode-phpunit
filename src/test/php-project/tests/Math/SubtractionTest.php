<?php

use PHPUnit\Framework\TestCase;
use Math\Subtraction;

class SubtractionTest extends TestCase {
    public function testSubtract() {
        $sut = new Subtraction();
        $result = $sut->subtract(5, 3);
        $this->assertEquals(2, $result);
    }
}
