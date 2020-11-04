---
layout: post
title: Testing asyncio code on Python 3.9
date: 2020-11-01
categories: python asyncio tdd testing
published: true
---
 
A few notes on how to unit test Python asyncio code.
Accompanying code available [here](https://github.com/ber2/basic-asyncio-example).

## Python's asyncio library

Starting from Python 3.7, and having received a lot of attention in subsequent releases, the
[asyncio](https://docs.python.org/3/library/asyncio.html) library provides a basis for comfortably
writing concurrent code. 

This is a good idea when you are given a task which is not CPU intensive, such that your program
will spend most of the time idly waiting for responses from other components. I/O bound tasks are
the typical example: when extracting data from a REST API, you are bound to spend most time sitting
on an idle CPU while waiting for HTTP responses.

Instead of parallelizing your execution into multiple processes, asynchronous code works with
coroutines. These are functions that do not return a value, but the promise of a value, once a call
has been awaited for. Recent versions of Python have added lots of work to the asyncio library, and
now there is a lot of syntactic sugar that makes life much sweeter.

The syntactic sugar is built around two keywords:
- `async`. A definition of a method with `async def` does not return a value, but an awaitable.
  There is also an `async with` context manager, which we will not discuss.
- `await`. This keyword can only be used inside of an async definition. It just tells an
  asynchronous call to wait for the promised value to be computed, so that it can be manipulated in
  code.

It is important to notice that once you enter into an async call, you enter a realm where every subsequent call is a
coroutine and will eventually have to be awaited for.

The `asyncio` library contains high level methods to call asynchronous code from within synchronous
code. Therefore, a typical asyncio program will contain a synchronous entrypoint, a call to a method
in asyncio asking to run a coroutine, waiting for results and then exiting.

A very simple asyncio program highlighting this, borrowed from the official documentation, is the following:
```python
import asyncio

async def main():
    print("Hello...")
    await asyncio.sleep(1)
    print("... World!")

asyncio.run(main())
```

__A note on third party libraries__: if you want to use them in an async context, they should be
designed within the asyncio paradigm. A very good example of that (and an oversimplification on my
side): [`aiohttp`](https://docs.aiohttp.org/en/stable/) is a library that works as an asyncio
analogous to the popular [`requests`](https://requests.readthedocs.io/en/master/) library.


## A small example

Imagine that we want to perform calls to a server in order to retrieve data. This could be a
database or a REST API. We will simulate these calls by providing an async method that will sleep
for a random number of seconds (between 10 and 60).

```python
import asyncio
import random


async def individual_task(task_number: int) -> None:
    seconds = random.randrange(10, 60)
    print(f"{task_number}\t{seconds}")
    await asyncio.sleep(seconds)
    print(f"Task {task_number} done")


async def main(n_tasks: int) -> None:

    print("Task #\tTime")
    print("-------------")

    tasks = [asyncio.create_task(individual_task(d)) for d in range(1, n_tasks + 1)]
    for task in tasks:
        await task


if __name__ == "__main__":
    asyncio.run(main(20))
```
This program runs 20 separate tasks concurrently, each taking between 10 and 60 seconds. Since the
program schedules all tasks while releasing the CPU, regardless of having to wait for them to
finish, a run will take at most 60 seconds. Equivalent synchronous code would take over 10 minutes
to run.

## Testing the code

Given that we have some code that sleeps,
the only real functionality we need to verify is that indeed it sleeps for the right amount of time.

However, there is another question a priori: how to write a test that verifies a coroutine.

### pytest-asyncio

The right answer to the above question is to let your test be a coroutine itself, which awaits on
the tested coroutine. In pytest, the [pytest-asyncio](https://github.com/pytest-dev/pytest-asyncio)
plugin provides helpers to minimize the amount of work. Namely:
- Declare the test method using `async def`, so that it turns into a coroutine.
- Decorate the test with `pytest.mark.asyncio`, so that pytest detects it and runs it in its own
  event loop.

Using this approach, we could test the `individual_task` method as follows:
```python
import time
import pytest
from awaits import individual_task


@pytest.mark.asyncio
async def test_individual_task():
    tic = time.time()
    await individual_task(2)
    tac = time.time()

    assert tac - tic >= 10
```
If the `individual_task` did something other than sleeping, we would await on it and then perform
assertions on the response, rather than timing the test.

This approach works and produces a valid test, but it does have a problem: this test will take at
least 10 seconds to run, and could take up to 60 seconds.

### Using AsyncMock

There is a way to speed the tests up, which is to mock the call to `asyncio.sleep`. Just like
python's `unittest.mock` provides [`Mock`](https://docs.python.org/3.8/library/unittest.mock.html#unittest.mock.Mock) objects that record calls that can be verified, starting
from python 3.8, there is an [`AsyncMock`](https://docs.python.org/3.8/library/unittest.mock.html#unittest.mock.AsyncMock) object that records awaits. Moreover, using [`mock.patch`](https://docs.python.org/3.8/library/unittest.mock.html#unittest.mock.patch) on a coroutine will replace it by an `AsyncMock` instead of a `Mock`.

Knowing this, we can mock the call to `sleep` and get a fast test. Notice how we replace the word
_call_ by _await_ when making assertions on the mocked object.

```python
import pytest
from unittest import mock
from awaits import individual_task


@pytest.mark.asyncio
@mock.patch("awaits.asyncio.sleep")
async def test_individual_task(sleep):
    await individual_task(2)
    sleep.assert_awaited_once()

    seconds = sleep.await_args.args[0]
    assert seconds in range(10, 60)
```

## Some general advice

If you have a project to code and a concurrent approach looks like a good idea, these are some
questions you should ask yourself before you code it away.

### Do you know how to do it synchronously?

Going async will add complexity to your code. Hence, unless you are very used to
it, ask yourself what the synchronous version of your code would look like, even if only as an
exercise.

### Will I get away with it if I go for a synchronous implementation?

If you do not have a performance problem, going async is a premature optimization. Synchronous code
is much easier to manage.

### Is async the right approach?

If you do have a performance problem, then pick between an async approach, a parallel approach
(using `multiprocessing` in python) or even a combination of both. In order to decide, it is a good
idea to find out where the bottlenecks are and whether they are related to CPU or I/O.

### Kudos for integration with other python tools

While working in this area I found that `asyncio` integrates very well with other python tools.
Besides `pytest`, which is the subject of this post, `typing` has the matching types for coroutines
and `mypy` detects types properly. Moreover, `contextlib` also has tools for asynchronous context
managers. In particular, the [`asynccontextmanager`](https://docs.python.org/3/library/contextlib.html#contextlib.asynccontextmanager) decorator works like a charm together with the `async with` expression.

### Use the right amount of mocking

Mocking is a good idea to avoid making calls to other components. This will keep your unit tests
__isolated__ and __fast__; these two are very desirable properties to have.

However, in my experience it is also a _powerful spice_. If one mocks away any call made within the
unit being tested, then one very easily ends up with a test centered around implementation details.
It is much more interesting to focus on business logic and behaviour, while not caring about
implementation details.

## References

- Official python documentation on the [asyncio library](https://docs.python.org/3/library/asyncio.html).
- Real Python's [complete walkthrough](https://realpython.com/async-io-python/).
