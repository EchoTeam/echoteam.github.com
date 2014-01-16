---
layout: post
title: How to start with Erlang/OTP releases
author: Yuri Lukyanov
author_url: http://www.linkedin.com/in/ylukyanov
---

# Introduction

When you try to google "erlang releases", you will only come across a few pages on the subject. Most of them will be [the official documentation](http://www.erlang.org/doc/design_principles/release_structure.html). There will also be a couple about releases with [rebar](https://github.com/rebar/rebar) and a relatively new tool [relx](http://relx.org/). Most likely you have already read those pages, or, at least, have made one or several approaches to that. But you are still not using OTP releases. And you certainly know why. Although those rare pages on the topic are worth reading, they do not give you a 'got-it' feeling. You lose yourself in the details and think that maybe it is not the right time for Erlang releases in your project, or it’s just too complicated and "git pull && make" on all your production nodes will do the thing for you forever. Meanwhile you also often find yourself reinventing the wheel. You implement ad-hoc procedures to update your code on-the-fly, to reload configuration files, scripts to start/stop applications and supervisors, etc. If this sounds familiar, this post is for you.

# Erlang releases overview

Erlang/OTP release principles are a set of rules and practices which allows you to organize your code in a self-contained package and also upgrade your application code in run-time.

The process looks simple from a bird’s eye view. You generate first release package ([a target system](http://www.erlang.org/doc/system_principles/create_target.html)) and install the system to your nodes. Then you decide to upgrade your applications and generate another release package with updated code and place it near the first one. Finally, you just switch the system to the new release. You can also switch back to the previous release if needed.

# The real situation

Erlang OTP comes with the sasl (System Architecture Support Libraries) application which provides, among other things, a set of tools to help you with making Erlang releases.  But, in fact, there are a lot of details and corner cases that you may come across.

Here come to the rescue such tools as [rebar](https://github.com/rebar/rebar) and [relx](http://relx.org/). Those are great and handful. They hide many low level details behind the scene. But they also leave a series of questions still open. How to organize the release process so it would be a logical continuation of the development process? How to deliver packages to production? How to switch between releases easily? How to bind .appup files to the code itself and not just generate them when packaging a release in the hope that they are correct and complete?

# Rebar service template

At Echo, we created [a rebar template](https://github.com/EchoTeam/rebar-templates) that builds a clean Erlang service framework which supports Erlang/OTP releases out of the box. It’s just a collection of files and scripts in right places that, with extensive help of rebar and some plugins, shapes a basis of a future service.

First, you need to install templates:

    $ mkdir -p ~/.rebar/templates
    $ git clone git@github.com:EchoTeam/rebar-templates.git ~/.rebar/templates

And rebar:

    $ cd ~
    $ wget https://github.com/rebar/rebar/wiki/rebar
    $ chmod u+x rebar

Now, come up with a service name. This name will become not only a service name, but also an OS user under which the service will be running and an Erlang node sname as well (all configurable later though). Now, when we’ve done with the naming:

    $ mkdir demo
    $ cd demo
    $ ~/rebar create template=service name=demo description="Demo project"
    $ ./run.me.first.sh

Note the last line. This script downloads initial dependencies, creates local git repository, and then deletes itself.

Our demo directory now looks like this:

    Makefile                project.sh
    README.md               rebar
    bin                     rebar.config
    deps                    rebar.config.lock
    ebin                    rel
    project.mk              test

At the moment, we have an empty service that is, however, fully operational. You can build a target system by running `make target` or run the project by `make run`. You also have a ready-to-push git repository with an initial commit. What is left to do is to include your own applications into the project by adding them to rebar.config and rel/reltool.config. See the [rebar template home page](https://github.com/EchoTeam/rebar-templates#creating-erlangotp-service-layout) for more information on how to do that and some other tricks.

The service template was designed so that you won’t need much detail about Erlang releases to start using them. Except one concept which is [.appup files](http://www.erlang.org/doc/design_principles/appup_cookbook.html).

# genappup

One of the main ideas of Erlang OTP releases is upgrades and downgrades done in run-time. The central role there play .appup files. Rebar [does a good job](https://github.com/rebar/rebar/wiki/Upgrades) on generating .appup files but it does this for all applications in a release package at once and put the files into the release right away.

We have our own tool for generating .appup files, [genappup](https://github.com/EchoTeam/genappup).  The idea of genappup is that an .appup file is strongly tied to an application and its code. It looks more convenient and logical to store the .appup file in the application repository close to the .app file. In this case, an .appup file becomes a regular part of your code changes. You can commit it and change in the future when needed.

genappup works only in the context of a particular application. It uses git meta information to make a diff of the changes you’ve made to the application and draws an src/\*.appup.src file accordingly. Then .appup.src is copied to ebin/\*.appup at compile time with the [rebar_genappup_plugin](https://github.com/EchoTeam/rebar-plugins#rebar_genappup_plugin).

For more information on how to use genappup, see [genappup homepage](https://github.com/EchoTeam/genappup#basic-workflow).

# What is next

Our new service definitely needs to be run on production. We can just set up an environment for the service and put the content from the directory `rel/demo` to our servers in a right place. But what is ‘a right place’? And, given a new release, should we do the whole upgrading process manually or with some ad-hoc shell scripting? We can do better. What if we pack a release into a software package like RPM, and do the necessary environment settings via pre- and post- package installation hooks? This is exactly what we do at Echo.

Let’s install [service packager](https://github.com/EchoTeam/service-packager) first:

    $ cd ~
    $ sudo gem install fpm
    $ git clone git@github.com:EchoTeam/service-packager.git
    $ cd service-packager
    $ make rpm
    $ sudo yum localinstall echo-service-packager-*.rpm

Next, we go to our demo project root directory and build a target system package:

    $ cd ~/demo
    $ service-build-target demo

In the project directory, now there is an RPM file, demo-0.1.0-1.x86_64.rpm. It contains everything our system needs, even Erlang VM itself. Now, on a new clean production node, we do this:

    $ sudo yum localinstall demo-0.1.0-1.x86_64.rpm
    $ sudo service demo start

Check that the service is running:

    $ sudo service demo ping
    pong

That’s all we need for the initial installation of a service.

Let’s emulate upgrade procedure. We return back to our project directory:

    $ cd ~/demo
    $ touch foo && git add foo && git commit -m "foo"
    $ git tag 0.2.0

Here we add a file to the repository. We do this for generating a new commit. The tag will give us a clean release/rpm version. Then we generate an upgrade package:

    $ service-build-upgrade demo demo-0.1.0-1.x86_64.rpm

Note that we specify a target package against which to generate an upgrade. The upgrade is placed into demo_upg_0.1.0_to_0.2.0-0.2.0-1.x86_64.rpm. Then, on the same production node, we install the upgrade:

    $ sudo yum localinstall demo_upg_0.1.0_to_0.2.0-0.2.0-1.x86_64.rpm

This rpm package contains a post-install hook that will switch the system to the new release. If you decide to rollback to the previous release, you just remove an upgrade package:

    $ sudo yum remove demo_upg_0.1.0_to_0.2.0

There is also a pre-uninstall hook that reverts the system back to the 0.1.0 version.

# Summary

Erlang OTP releases are quite difficult to use. You certainly don’t need them for simple projects. But  when your project grows up, OTP releases can offer you a significant assistance once you have adopted them. We hope that with our tools, a [rebar service template](https://github.com/EchoTeam/rebar-templates), [genappup](https://github.com/EchoTeam/genappup) and [service-packager](https://github.com/EchoTeam/service-packager), you will be able to make that process more smooth.
