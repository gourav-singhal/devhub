// @flow

import React from 'react';
import { TouchableWithoutFeedback } from 'react-native';
import { List, Map, Set } from 'immutable';
import Icon from 'react-native-vector-icons/Octicons';
import { withTheme } from 'styled-components/native';

// rows
import BranchRow from './_BranchRow';
import CommentRow from './_CommentRow';
import CommitListRow from './_CommitListRow';
import IssueRow from './_IssueRow';
import PullRequestRow from './_PullRequestRow';
import ReleaseRow from './_ReleaseRow';
import RepositoryRow from './_RepositoryRow';
import RepositoryListRow from './_RepositoryListRow';
import UserListRow from './_UserListRow';
import WikiPageListRow from './_WikiPageListRow';

import IntervalRefresh from '../IntervalRefresh';
import ScrollableContentContainer from '../ScrollableContentContainer';
import TransparentTextOverlay from '../TransparentTextOverlay';
import UserAvatar from './_UserAvatar';
import { avatarWidth, contentPadding } from '../../styles/variables';
import { getDateSmallText } from '../../utils/helpers';
import { getEventIcon, getEventText } from '../../utils/helpers/github';
import type { ActionCreators, GithubEvent, ThemeObject } from '../../utils/types';

import {
  smallAvatarWidth,
  CardWrapper,
  FullView,
  FullAbsoluteView,
  HorizontalView,
  Header,
  LeftColumn,
  MainColumn,
  HeaderRow,
  Text,
  SmallText,
  Username,
  CardIcon,
} from './__CardComponents';

@withTheme
export default class extends React.PureComponent {
  props: {
    actions: ActionCreators,
    event: GithubEvent,
    onlyOneRepository?: boolean,
    seen?: boolean,
    theme: ThemeObject,
  };

  render() {
    const { actions, event, onlyOneRepository, seen, theme, ...props } = this.props;

    const {
      type,
      payload,
      actor,
      repo,
      created_at,
      merged,
    } = {
      type: event.get('type'),
      payload: event.get('payload'),
      actor: event.get('actor') || Map(),
      repo: event.get('repo'),
      created_at: event.get('created_at'),
      merged: event.get('merged'),
    };

    if (!payload) return null;

    let eventIds = Set([event.get('id')]);
    if (merged) {
      merged.forEach(mergedEvent => {
        eventIds = eventIds.add(mergedEvent.get('id'));
      });
    }

    const isPrivate = event.get('private') || event.get('public') === false;

    return (
      <CardWrapper {...props} seen={seen}>
        <FullAbsoluteView zIndex={seen ? 1 : -1}>
          <TouchableWithoutFeedback onPress={() => actions.toggleSeenEvent(eventIds)}>
            <FullAbsoluteView />
          </TouchableWithoutFeedback>
        </FullAbsoluteView>

        <FullAbsoluteView style={{ top: contentPadding + avatarWidth, left: contentPadding, right: null, width: avatarWidth - smallAvatarWidth, zIndex: 1 }}>
          <TouchableWithoutFeedback onPress={() => actions.toggleSeenEvent(eventIds)}>
            <FullAbsoluteView />
          </TouchableWithoutFeedback>
        </FullAbsoluteView>

        <Header>
          <LeftColumn>
            <UserAvatar url={actor.get('avatar_url')} size={avatarWidth} />
          </LeftColumn>

          <MainColumn>
            <HeaderRow>
              <FullView>
                <TransparentTextOverlay color={theme.base02} size={contentPadding} from="right">
                  <ScrollableContentContainer>
                    <HorizontalView>
                      <Username numberOfLines={1}>
                        {actor.get('display_login') || actor.get('login')}
                      </Username>
                      <IntervalRefresh
                        interval={1000}
                        onRender={
                          () => {
                            const dateText = getDateSmallText(created_at, '•');
                            return dateText && (
                              <SmallText style={{ flex: 1 }} muted> • {dateText}</SmallText>
                            );
                          }
                        }
                      />
                    </HorizontalView>
                  </ScrollableContentContainer>
                </TransparentTextOverlay>

                <Text numberOfLines={1} muted>
                  {isPrivate && <Text muted><Icon name="lock" />&nbsp;</Text>}
                  {getEventText(event, { repoIsKnown: onlyOneRepository })}
                </Text>
              </FullView>

              <CardIcon name={getEventIcon(event)} />
            </HeaderRow>

            <FullAbsoluteView>
              <TouchableWithoutFeedback onPress={() => actions.toggleSeenEvent(eventIds)}>
                <FullAbsoluteView />
              </TouchableWithoutFeedback>
            </FullAbsoluteView>
          </MainColumn>
        </Header>

        {
          repo && !onlyOneRepository &&
          <RepositoryRow
            actions={actions}
            repo={repo}
            pushed={type === 'PushEvent'}
            forcePushed={type === 'PushEvent' && payload.get('forced')}
            narrow
          />
        }

        {
          (() => {
            const repos = (payload.get('repos') || List()).filter(Boolean);

            if (!(repos.size > 0)) return null;

            return (
              <RepositoryListRow
                actions={actions}
                repos={repos}
                pushed={type === 'PushEvent'}
                forcePushed={type === 'PushEvent' && payload.get('forced')}
                narrow
              />
            );
          })()
        }

        {
          payload.get('ref') &&
          <BranchRow type={type} branch={payload.get('ref')} narrow />
        }

        {
          payload.get('forkee') &&
          <RepositoryRow
            actions={actions}
            repo={payload.get('forkee')}
            forcePushed={type === 'PushEvent' && payload.get('forced')}
            isFork
            narrow
          />
        }

        {
          (() => {
            const member = payload.get('member');
            const users = (payload.get('users') || List([member])).filter(Boolean);

            if (!(users.size > 0)) return null;

            return (
              <UserListRow users={users} narrow />
            );
          })()
        }

        {
          type === 'GollumEvent' &&
          payload.get('pages') &&
          <WikiPageListRow pages={payload.get('pages')} narrow />
        }

        {
          payload.get('pull_request') &&
          <PullRequestRow pullRequest={payload.get('pull_request')} narrow />
        }

        {
          (() => {
            const { commits, headCommit } = {
              commits: payload.get('commits'),
              headCommit: payload.get('head_commit'),
            };

            const list = (commits || List([headCommit])).filter(Boolean);
            if (!(list.size > 0)) return null;

            return (
              <CommitListRow commits={list} narrow />
            );
          })()
        }

        {
          payload.get('issue') &&
          <IssueRow issue={payload.get('issue')} narrow />
        }

        {
          (
            type === 'IssuesEvent' && payload.get('action') === 'opened' &&
            payload.getIn(['issue', 'body']) &&
            <CommentRow user={actor} body={payload.getIn(['issue', 'body'])} narrow />

            ||

            type === 'PullRequestEvent' && payload.get('action') === 'opened' &&
            payload.getIn(['pull_request', 'body']) &&
            <CommentRow user={actor} body={payload.getIn(['pull_request', 'body'])} narrow />

            ||

            payload.getIn(['comment', 'body']) &&
            <CommentRow user={actor} body={payload.getIn(['comment', 'body'])} narrow />
          )
        }

        {
          payload.get('release') &&
          <ReleaseRow release={payload.get('release')} type={type} narrow />
        }
      </CardWrapper>
    );
  }
}